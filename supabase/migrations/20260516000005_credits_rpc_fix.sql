-- Replace apply_credit_delta to fix two CHECK-constraint interaction bugs found in T2 verification:
--
-- 1) The original INSERT ... ON CONFLICT pattern triggered the user_credits.balance>=0 CHECK
--    on the proposed INSERT row's value (p_delta) BEFORE conflict resolution could apply the
--    UPDATE. Negative deltas on existing users failed with a raw check_violation, never reaching
--    our INSUFFICIENT_CREDITS branch.
--
-- 2) After switching to UPDATE-first, the CHECK still fires when balance + p_delta < 0.
--    Wrap the UPDATE/INSERT in a sub-block that catches check_violation and re-raises as
--    INSUFFICIENT_CREDITS, so callers see one stable error code.

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

  begin
    update public.user_credits
      set balance = balance + p_delta,
          updated_at = now()
      where user_id = p_user_id
      returning balance into v_new_balance;

    if not found then
      insert into public.user_credits(user_id, balance) values (p_user_id, p_delta)
        returning balance into v_new_balance;
    end if;
  exception when check_violation then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = '23514';
  end;

  return v_new_balance;
end;
$$;
