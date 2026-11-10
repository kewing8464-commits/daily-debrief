-- Daily Debrief: vibe checks, quick notes during the day that the night debrief builds on.
create table if not exists public.vibe_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day_date date not null,
  created_at timestamptz not null default now(),
  text text not null check (char_length(text) between 1 and 1000),
  mode text not null default 'type' check (mode in ('type', 'talk')),
  tags text[] not null default '{}'
);

create index if not exists vibe_checks_user_date on public.vibe_checks (user_id, day_date);

alter table public.vibe_checks enable row level security;

drop policy if exists "own vibe checks" on public.vibe_checks;
create policy "own vibe checks" on public.vibe_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
