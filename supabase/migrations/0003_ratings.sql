-- Daily Debrief v2: optional productive and focus ratings (1-4), days added from memory,
-- and a switch to turn the two ratings off.

alter table public.days add column if not exists productive smallint check (productive between 1 and 4);
alter table public.days add column if not exists focus smallint check (focus between 1 and 4);
alter table public.days add column if not exists from_memory boolean not null default false;
alter table public.profiles add column if not exists ratings_on boolean not null default true;
