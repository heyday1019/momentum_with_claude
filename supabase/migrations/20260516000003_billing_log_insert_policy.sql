-- billing_log INSERT 정책 — RLS-enabled 테이블에 INSERT policy 가 없어서 일반
-- server action(쿠키 세션)의 logBilling 호출이 조용히 거부되던 버그를 수정.
-- payload/error 는 우리 코드만 채우므로 사용자 입력 직결 위험은 없다. read 는 admin-only 유지.
create policy "billing_log_authenticated_insert" on public.billing_log
  for insert to authenticated
  with check (true);
