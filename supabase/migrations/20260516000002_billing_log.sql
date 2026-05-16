-- Phase 4 (Billing): observability log for checkout / webhook / credit application

create table public.billing_log (
  id bigint generated always as identity primary key,
  event text not null check (event in (
    'checkout_started','webhook_received','webhook_signature_invalid',
    'credit_applied','error'
  )),
  user_id uuid references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index billing_log_created_idx on public.billing_log (created_at desc);
create index billing_log_user_idx on public.billing_log (user_id, created_at desc);

alter table public.billing_log enable row level security;
-- 일반 사용자 read 불가. /admin 페이지에서 service role 로 조회.
