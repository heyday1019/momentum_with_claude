-- Phase 4 (Billing): user_credits balance cache + credit_ledger source of truth + signup bonus

-- ========== user_credits ==========
create table public.user_credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger user_credits_set_updated_at
  before update on public.user_credits
  for each row execute function public.update_updated_at_column();

alter table public.user_credits enable row level security;

create policy "user_credits_owner_select" on public.user_credits
  for select using (auth.uid() = user_id);

-- ========== credit_ledger ==========
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in (
    'signup_bonus','purchase','consume_daily','consume_zodiac',
    'consume_tarot','consume_dream','consume_lotto','refund','admin_adjust'
  )),
  polar_order_id text unique,
  related_kind text,
  related_id text,
  created_at timestamptz not null default now()
);

create index credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "credit_ledger_owner_select" on public.credit_ledger
  for select using (auth.uid() = user_id);

-- ========== signup bonus trigger ==========
create or replace function public.grant_signup_credits()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_credits(user_id, balance) values (new.id, 5);
  insert into public.credit_ledger(user_id, delta, reason)
    values (new.id, 5, 'signup_bonus');
  return new;
end;
$$;

create trigger profiles_after_insert_grant_credits
  after insert on public.profiles
  for each row execute function public.grant_signup_credits();

-- ========== apply_credit_delta RPC ==========
create or replace function public.apply_credit_delta(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_polar_order_id text default null,
  p_related_kind text default null,
  p_related_id text default null
) returns integer
language plpgsql security definer as $$
declare
  v_new_balance integer;
begin
  if p_polar_order_id is not null then
    if exists (select 1 from public.credit_ledger where polar_order_id = p_polar_order_id) then
      return coalesce((select balance from public.user_credits where user_id = p_user_id), 0);
    end if;
  end if;

  insert into public.credit_ledger(user_id, delta, reason, polar_order_id, related_kind, related_id)
    values (p_user_id, p_delta, p_reason, p_polar_order_id, p_related_kind, p_related_id);

  insert into public.user_credits(user_id, balance) values (p_user_id, p_delta)
    on conflict (user_id) do update
      set balance = public.user_credits.balance + excluded.balance,
          updated_at = now()
    returning balance into v_new_balance;

  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = '23514';
  end if;

  return v_new_balance;
end;
$$;
