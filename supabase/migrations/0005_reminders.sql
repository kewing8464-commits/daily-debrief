-- Daily Debrief: nightly reminders by web push.
-- Each device that turns reminders on gets a row in push_subscriptions. Every 15 minutes a
-- pg_cron job asks reminder_batch() who is due, and posts that list to the app, which sends the pushes.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  reminder_on boolean not null default true,
  followup_on boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.profiles add column if not exists reminders_paused_until date;
alter table public.profiles add column if not exists last_reminder_on date;
alter table public.profiles add column if not exists last_followup_on date;

-- Server-only settings (not exposed through the API).
create schema if not exists private;
create table if not exists private.settings (key text primary key, value text not null);
revoke all on schema private from public, anon, authenticated;

-- Who is due right now. Nightly: within 15 minutes after their debrief time, no saved debrief yet.
-- Follow-up: 60 to 75 minutes after, only if the nightly one went out and they still haven't saved.
-- Marks what it returns as sent, so nobody gets two of the same reminder in a night.
create or replace function public.reminder_batch(p_now timestamptz default now())
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  result jsonb := '[]'::jsonb;
  local_ts timestamp;
  ddate date;
  since int;
  kind text;
  day_status text;
  subs jsonb;
  notes int;
begin
  for r in
    select p.id, p.name, p.timezone, p.debrief_time, p.reminders_paused_until, p.last_reminder_on, p.last_followup_on
    from public.profiles p
    where exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
  loop
    local_ts := p_now at time zone r.timezone;
    ddate := (local_ts - interval '4 hours')::date; -- before 4am counts as the day before
    if r.reminders_paused_until is not null and r.reminders_paused_until >= ddate then continue; end if;
    select status into day_status from public.days where user_id = r.id and day_date = ddate;
    if day_status = 'saved' then continue; end if;
    since := ((extract(hour from local_ts) * 60 + extract(minute from local_ts))::int
              - (extract(hour from r.debrief_time) * 60 + extract(minute from r.debrief_time))::int + 1440) % 1440;
    kind := null;
    if since < 15 and r.last_reminder_on is distinct from ddate then
      kind := 'nightly';
    elsif since >= 60 and since < 75 and r.last_reminder_on = ddate and r.last_followup_on is distinct from ddate then
      kind := 'followup';
    end if;
    if kind is null then continue; end if;

    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
      into subs from public.push_subscriptions s
      where s.user_id = r.id and (case when kind = 'nightly' then s.reminder_on else s.followup_on end);
    if jsonb_array_length(subs) = 0 then continue; end if;
    select count(*) into notes from public.vibe_checks where user_id = r.id and day_date = ddate;

    if kind = 'nightly' then
      update public.profiles set last_reminder_on = ddate where id = r.id;
    else
      update public.profiles set last_followup_on = ddate where id = r.id;
    end if;
    result := result || jsonb_build_object('kind', kind, 'name', r.name, 'day', ddate, 'started', day_status = 'draft', 'notes', notes, 'subs', subs);
  end loop;
  return result;
end $$;
revoke all on function public.reminder_batch(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_batch(timestamptz) to service_role;

-- The app calls this to drop device addresses the push service says are gone. Needs the cron secret.
create or replace function public.forget_push_endpoints(p_secret text, p_endpoints text[])
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_secret is null or p_secret is distinct from (select value from private.settings where key = 'cron_secret') then
    raise exception 'not allowed';
  end if;
  delete from public.push_subscriptions where endpoint = any(p_endpoints);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.forget_push_endpoints(text, text[]) from public;
grant execute on function public.forget_push_endpoints(text, text[]) to anon, authenticated;

-- Every 15 minutes: work out who is due and hand the list to the app.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('daily-debrief-reminders') where exists (select 1 from cron.job where jobname = 'daily-debrief-reminders');
select cron.schedule('daily-debrief-reminders', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://daily-debrief-nine.vercel.app/api/cron/push',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select value from private.settings where key = 'cron_secret')),
    body := jsonb_build_object('batch', b)
  )
  from (select public.reminder_batch() as b) x
  where jsonb_array_length(b) > 0
$job$);
