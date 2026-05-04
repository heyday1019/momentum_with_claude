-- Phase 3 (AI call log — 모든 모델 호출 토큰 사용량 누적)

create table public.ai_call_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('daily','zodiac','lotto','tarot_three','tarot_one','dream')),
  persona text check (persona in ('master','fortune','fairy')),
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create index ai_call_log_created_idx on public.ai_call_log (created_at desc);
create index ai_call_log_feature_idx on public.ai_call_log (feature);
create index ai_call_log_model_idx on public.ai_call_log (model);
create index ai_call_log_user_idx on public.ai_call_log (user_id);

alter table public.ai_call_log enable row level security;

create policy "ai_call_log_owner_select" on public.ai_call_log
  for select using (auth.uid() = user_id);
create policy "ai_call_log_owner_insert" on public.ai_call_log
  for insert with check (auth.uid() = user_id);
-- 관리자 조회는 service_role 키로 RLS 우회
