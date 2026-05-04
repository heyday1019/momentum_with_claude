-- Phase 3 (Dream journal — 꿈 해몽 결과 자동 보관)

create table public.dream_journal (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  persona text not null check (persona in ('master','fortune','fairy')),
  model text not null,
  dream_content text not null,
  summary text not null,
  interpretation text not null,
  symbols jsonb not null,
  advice text not null,
  created_at timestamptz not null default now()
);

create index dream_journal_user_created_idx
  on public.dream_journal (user_id, created_at desc);

alter table public.dream_journal enable row level security;

create policy "dream_journal_owner_select" on public.dream_journal
  for select using (auth.uid() = user_id);
create policy "dream_journal_owner_insert" on public.dream_journal
  for insert with check (auth.uid() = user_id);
create policy "dream_journal_owner_delete" on public.dream_journal
  for delete using (auth.uid() = user_id);
