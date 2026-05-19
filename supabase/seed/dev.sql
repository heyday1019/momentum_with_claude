-- Development Supabase seed
-- Apply via Supabase MCP `execute_sql` (one-time after dev project + OAuth login)
-- 운영 사용자 데이터는 절대 복제하지 않음. PII 격리 원칙.
--
-- 사전 조건:
--   1. dev Supabase 에 OAuth 로 1회 로그인 (auth.users 행 생성)
--   2. /onboarding 에서 프로필 저장 (profiles 행 생성 → signup trigger 가 user_credits 5 자동 부여)
--   3. 본인 user_id 조회: select id, email from auth.users limit 5;
--   4. 아래 `<dev-test-user-uuid>` 자리에 실제 uuid 치환 후 실행
--
-- 스키마 참조:
--   profiles      : id, name (max 30), birthdate (1900-01-01 ~ today), gender ('male'|'female'|'other')
--   credit_ledger : user_id, delta (!=0), reason (enum: signup_bonus, purchase, consume_*, refund, admin_adjust)
--   user_credits  : user_id, balance (잔액 캐시, signup trigger 가 5 자동 적립)

-- Step 1: 프로필 보강 (onboarding 으로 행은 이미 있을 것 — 값만 덮어쓰기)
insert into profiles (id, name, birthdate, gender)
values
  ('<dev-test-user-uuid>', '테스트유저', '1990-01-01', 'other')
on conflict (id) do update
  set name = excluded.name,
      birthdate = excluded.birthdate,
      gender = excluded.gender;

-- Step 2: 테스트 크레딧 50 부여 — ledger 에 admin_adjust 사유로 기록
insert into credit_ledger (user_id, delta, reason)
values
  ('<dev-test-user-uuid>', 50, 'admin_adjust');

-- Step 3: 잔액 캐시 동기화 (ledger 와 user_credits 는 RPC 외부에서 별도 갱신 필요)
update user_credits
set balance = balance + 50
where user_id = '<dev-test-user-uuid>';

-- Step 4: 검증 (주석 해제 후 실행)
-- select user_id, sum(delta) as ledger_total from credit_ledger
--   where user_id = '<dev-test-user-uuid>' group by user_id;
-- select user_id, balance from user_credits
--   where user_id = '<dev-test-user-uuid>';
-- 예상: ledger_total = 55 (signup 5 + dev 50), balance = 55
