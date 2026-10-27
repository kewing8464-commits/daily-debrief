-- Daily Debrief: profiles and days. Every row belongs to one user, and
-- row-level security makes sure a user can only ever see their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  debrief_time time not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day_date date not null,
  score int check (score between 1 and 10),
  mode text check (mode in ('type', 'talk')),
  duration_sec int,
  summary jsonb,
  transcript jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'saved')),
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_date)
);

create index if not exists days_user_date on public.days (user_id, day_date desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists days_touch on public.days;
create trigger days_touch before update on public.days
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.days enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own days" on public.days;
create policy "own days" on public.days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
