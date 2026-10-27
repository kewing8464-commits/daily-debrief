-- Daily Debrief: "Connect your AI". Each user can have one connector link.
-- We only keep a hash of the secret, and the AI's requests are answered by
-- the two functions below, which only ever return the link owner's saved days.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.connector_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.connector_tokens enable row level security;

drop policy if exists "own connector" on public.connector_tokens;
create policy "own connector" on public.connector_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.connector_profile(p_token text)
returns table (name text, timezone text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid;
begin
  update public.connector_tokens t set last_used_at = now()
    where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    returning t.user_id into v_user;
  if v_user is null then return; end if;
  return query select p.name, p.timezone from public.profiles p where p.id = v_user;
end $$;

create or replace function public.connector_days(p_token text, p_from date, p_to date)
returns setof public.days
language sql stable security definer set search_path = public, extensions as $$
  select d.* from public.days d
  join public.connector_tokens t on t.user_id = d.user_id
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and d.status = 'saved'
    and d.day_date between p_from and p_to
  order by d.day_date;
$$;

revoke all on function public.connector_profile(text) from public;
revoke all on function public.connector_days(text, date, date) from public;
grant execute on function public.connector_profile(text) to anon, authenticated;
grant execute on function public.connector_days(text, date, date) to anon, authenticated;
