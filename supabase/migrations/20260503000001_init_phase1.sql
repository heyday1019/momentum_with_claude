-- Phase 1 (Foundation): profiles + fortune_daily + lotto_recommendations + RLS

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 30),
  birthdate date not null check (birthdate between '1900-01-01' and current_date),
  gender text not null check (gender in ('male','female','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

alter table public.profiles enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id);

-- ========== fortune_daily ==========
create table public.fortune_daily (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  fortune_type text not null check (fortune_type in ('daily','zodiac')),
  content jsonb not null,
  model text not null default 'anthropic/claude-haiku-4-5',
  created_at timestamptz not null default now(),
  unique (user_id, date, fortune_type)
);

alter table public.fortune_daily enable row level security;

create policy "fortune_daily_owner_select" on public.fortune_daily
  for select using (auth.uid() = user_id);
create policy "fortune_daily_owner_insert" on public.fortune_daily
  for insert with check (auth.uid() = user_id);

-- ========== lotto_recommendations ==========
create table public.lotto_recommendations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  draw_number integer not null check (draw_number > 0),
  numbers integer[] not null check (
    array_length(numbers, 1) = 6
    and numbers <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45]::int[]
  ),
  comment text not null,
  created_at timestamptz not null default now(),
  unique (user_id, draw_number)
);

alter table public.lotto_recommendations enable row level security;

create policy "lotto_owner_select" on public.lotto_recommendations
  for select using (auth.uid() = user_id);
create policy "lotto_owner_insert" on public.lotto_recommendations
  for insert with check (auth.uid() = user_id);
