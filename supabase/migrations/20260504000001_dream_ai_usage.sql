-- Phase 3 (Dream AI persona usage stats)

create table public.dream_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  persona text not null check (persona in ('master','fortune','fairy')),
  model text not null,
  created_at timestamptz not null default now()
);

create index dream_ai_usage_user_persona_created_idx
  on public.dream_ai_usage (user_id, persona, created_at desc);

alter table public.dream_ai_usage enable row level security;

create policy "dream_ai_usage_owner_select" on public.dream_ai_usage
  for select using (auth.uid() = user_id);
create policy "dream_ai_usage_owner_insert" on public.dream_ai_usage
  for insert with check (auth.uid() = user_id);
