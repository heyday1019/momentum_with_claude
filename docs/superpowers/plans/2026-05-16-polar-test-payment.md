# Polar Sandbox 테스트 결제 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 운세 호출에 크레딧 차감을 도입하고, Polar Sandbox 호스티드 체크아웃으로 3-tier 패키지를 구매·적립할 수 있는 결제 시스템을 구축한다.

**Architecture:** Ledger-first 데이터 모델(`credit_ledger`가 source of truth, `user_credits.balance`가 캐시). 결제 적립은 웹훅(주) + success URL(보조)에서 동일 `polar_order_id`를 키로 idempotent하게 처리. 모든 적립/차감은 `apply_credit_delta` security-definer PRPC를 통해 단일 경로로 흐른다.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + service role for webhook), Polar Sandbox (REST + Standard Webhooks), vitest, Tailwind v4 + 기존 `fortune-*` 디자인 토큰.

**Spec:** [`docs/superpowers/specs/2026-05-16-polar-test-payment-design.md`](../specs/2026-05-16-polar-test-payment-design.md)

---

## File Structure

### NEW

| 경로 | 책임 |
|---|---|
| `supabase/migrations/20260516000001_credits.sql` | `user_credits` + `credit_ledger` + `apply_credit_delta` RPC + signup trigger |
| `supabase/migrations/20260516000002_billing_log.sql` | `billing_log` 테이블 (관측·디버깅) |
| `src/lib/billing/packages.ts` | `CREDIT_PACKAGES` 상수와 SKU 타입 |
| `src/lib/billing/credits.ts` | `deriveCreditsFromProduct(productId)` — env product_id → credits 매핑 |
| `src/lib/billing/polar.ts` | Polar REST 얇은 wrapper (Bearer 인증, base URL 분기) |
| `src/lib/billing/webhook-signature.ts` | Standard Webhooks HMAC-SHA256 검증 |
| `src/lib/billing/consume.ts` | `consumeCredit({userId, feature})` — RPC 호출 + INSUFFICIENT_CREDITS 식별 |
| `src/lib/billing/log.ts` | `logBilling({event, ...})` — billing_log insert |
| `src/lib/billing/balance.ts` | `getCreditBalance(supabase, userId)` — RLS 통과 잔액 read |
| `src/lib/billing/__tests__/packages.test.ts` | SKU 상수 무결성 |
| `src/lib/billing/__tests__/credits.test.ts` | `deriveCreditsFromProduct` 매핑·미매핑 throw |
| `src/lib/billing/__tests__/webhook-signature.test.ts` | HMAC 유효/위조/timestamp skew/누락 헤더 |
| `src/lib/billing/__tests__/webhook-route.test.ts` | 핸들러: 유효/위조/중복 3케이스 |
| `src/app/actions/billing.ts` | `startCheckout(sku)` server action |
| `src/app/api/polar/webhook/route.ts` | 웹훅 POST 핸들러 |
| `src/app/billing/page.tsx` | 3-tier 충전 페이지 (server component) |
| `src/app/billing/success/page.tsx` | 결제 완료 후 도착지 + idempotent 보조 적립 |
| `src/components/billing/credit-package-card.tsx` | 단일 패키지 카드 (client, form action 트리거) |
| `src/components/billing/credit-badge.tsx` | 헤더 우측 잔액 칩 |
| `src/components/billing/purchase-success-card.tsx` | success 페이지 메인 카드 |
| `src/components/billing/insufficient-credits-dialog.tsx` | Radix Dialog 기반 모달 (dream-form 전용) |
| `src/components/billing/needs-credits-card.tsx` | server-render 분기에서 사용하는 인라인 안내 카드 |

### MODIFIED

| 경로 | 변경 |
|---|---|
| `.env.example` | Polar env vars 5개 추가 |
| `src/lib/supabase/database.types.ts` | 마이그레이션 적용 후 재생성 |
| `src/components/fortune/app-header.tsx` | `<CreditBadge/>` 통합 |
| `src/app/actions/fortune.ts` | `getDailyFortune`/`getZodiacFortune`/`getLottoRec` 차감 wrapping |
| `src/app/actions/tarot.ts` | `getTarotReading`/`getTarotOneCardReading` 차감 wrapping |
| `src/app/actions/dream.ts` | `getDreamInterpretation` 차감 wrapping (기존 `DreamActionResult` 확장) |
| `src/app/page.tsx` | `DailyCard`/`ZodiacCard`/`LottoCard` server-side catch → `NeedsCreditsCard` |
| `src/app/tarot/result/page.tsx` | `ThreeCardReadingSection`/`OneCardReadingSection` 동일 패턴 |
| `src/components/fortune/dream-form.tsx` | client form: `code === 'INSUFFICIENT_CREDITS'` → Dialog |

### NOT TOUCHED

- `src/proxy.ts` — 이미 `pathname.startsWith('/api')` 분기에서 인증 skip 처리됨. 추가 작업 없음
- `src/lib/supabase/admin.ts` — `createAdminClient()` 기존 그대로 사용
- `src/lib/openrouter/log.ts` — `ai_call_log`는 그대로. `billing_log`는 별도 테이블

---

## Task 1: Credits DB migration (schema + RPC + signup trigger)

**Files:**
- Create: `supabase/migrations/20260516000001_credits.sql`
- Modify: `src/lib/supabase/database.types.ts` (전체 재생성)

- [ ] **Step 1: SQL 마이그레이션 작성**

`supabase/migrations/20260516000001_credits.sql`:

```sql
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
-- INSERT/UPDATE 는 security definer RPC 만. 클라이언트 write 정책 없음.

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
-- INSERT 는 서버 RPC 만.

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
  -- idempotency: 같은 polar_order_id 로 두 번 적립 방지
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
```

- [ ] **Step 2: MCP로 마이그레이션 적용**

Supabase MCP `apply_migration` 호출:
- `name`: `20260516000001_credits`
- `query`: 위 SQL 전체

기대 결과: "Migration applied" 같은 성공 메시지. 에러 시 SQL 검토 후 재시도.

- [ ] **Step 3: 타입 재생성**

Supabase MCP `generate_typescript_types` 호출 → 결과를 `src/lib/supabase/database.types.ts`에 전체 덮어쓰기.

- [ ] **Step 4: 빌드 검증**

```
npm run lint
```

기대: 새 타입과 충돌 없음 (이 단계에서 코드 변경 전이므로 PASS 해야 함).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260516000001_credits.sql src/lib/supabase/database.types.ts
git commit -m "feat(billing): add credits schema with ledger and signup bonus trigger"
```

---

## Task 2: Credits 스키마·트리거 동작 검증 (MCP execute_sql)

DB 통합 테스트를 별도 vitest 파일로 두기보다 MCP `execute_sql`로 1회성 라이브 검증. RPC와 트리거가 의도대로 동작하는지 확인하고, 검증 후 테스트 row는 cleanup.

**Files:** (코드 변경 없음, 검증만)

- [ ] **Step 1: 테스트용 임시 user 생성**

MCP `execute_sql`:
```sql
-- 임시 auth user 가 필요하므로 직접 profiles 에 row 추가는 FK 위반.
-- auth.users 에 임시 row 를 만들고 profiles 를 INSERT 해서 트리거 발화 확인.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values ('00000000-0000-0000-0000-0000000000aa', 'plan-test@local', '{}'::jsonb, 'authenticated', 'authenticated');

insert into public.profiles (id, name, birthdate, gender)
values ('00000000-0000-0000-0000-0000000000aa', 'plan-test', '1990-01-01', 'other');
```

- [ ] **Step 2: 가입 보너스 확인**

```sql
select balance from public.user_credits where user_id = '00000000-0000-0000-0000-0000000000aa';
-- 기대: 5

select delta, reason from public.credit_ledger
where user_id = '00000000-0000-0000-0000-0000000000aa';
-- 기대: 1행, delta=5, reason=signup_bonus
```

- [ ] **Step 3: 차감 RPC 동작 확인**

```sql
select public.apply_credit_delta(
  '00000000-0000-0000-0000-0000000000aa'::uuid,
  -1,
  'consume_daily',
  null,
  'daily',
  '2026-05-16'
);
-- 기대: 4

select balance from public.user_credits where user_id = '00000000-0000-0000-0000-0000000000aa';
-- 기대: 4
```

- [ ] **Step 4: idempotency 확인 (같은 polar_order_id 두 번 적립)**

```sql
select public.apply_credit_delta('00000000-0000-0000-0000-0000000000aa'::uuid, 50, 'purchase', 'order_test_1');
-- 기대: 54

select public.apply_credit_delta('00000000-0000-0000-0000-0000000000aa'::uuid, 50, 'purchase', 'order_test_1');
-- 기대: 54  (NO-OP, 같은 값 반환)

select count(*) from public.credit_ledger where polar_order_id = 'order_test_1';
-- 기대: 1
```

- [ ] **Step 5: 잔액 음수 throw 확인**

```sql
select public.apply_credit_delta('00000000-0000-0000-0000-0000000000aa'::uuid, -1000, 'consume_daily');
-- 기대: ERROR: INSUFFICIENT_CREDITS (SQLSTATE 23514)
```

- [ ] **Step 6: 정리**

```sql
delete from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000aa';
-- credit_ledger / user_credits 는 ON DELETE CASCADE 로 자동 정리.

select count(*) from public.user_credits where user_id = '00000000-0000-0000-0000-0000000000aa';
-- 기대: 0
```

- [ ] **Step 7: Commit (없음)** — 검증만 했으므로 커밋 없이 Task 3 으로 이동

---

## Task 3: billing_log 마이그레이션

**Files:**
- Create: `supabase/migrations/20260516000002_billing_log.sql`
- Modify: `src/lib/supabase/database.types.ts` (재생성)

- [ ] **Step 1: SQL 작성**

`supabase/migrations/20260516000002_billing_log.sql`:

```sql
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
-- 일반 사용자 read 불가. ADMIN_EMAILS 의 /admin 페이지에서 service role 로 조회.
```

- [ ] **Step 2: MCP `apply_migration` 적용**

`name`: `20260516000002_billing_log`, `query`: 위 SQL.

- [ ] **Step 3: 타입 재생성 → `database.types.ts` 덮어쓰기**

MCP `generate_typescript_types`.

- [ ] **Step 4: 빌드 검증**

```
npm run lint
```

기대: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260516000002_billing_log.sql src/lib/supabase/database.types.ts
git commit -m "feat(billing): add billing_log table for checkout/webhook observability"
```

---

## Task 4: .env.example 업데이트

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Polar env 5개 추가**

`.env.example` 끝에 추가:

```
# Polar Sandbox (https://sandbox.polar.sh) — 결제 시스템.
# Organization Access Token (polar_oat_...) 발급 후 입력.
POLAR_ORG_TOKEN=<polar_oat_...>

# 웹훅 생성 시 발급된 시크릿 (whsec_...) — 서명 검증에 사용.
POLAR_WEBHOOK_SECRET=<whsec_...>

# sandbox 또는 production. Polar API base URL 분기.
POLAR_ENV=sandbox

# Polar에서 생성한 3개 패키지의 product ID. 'prod_' 로 시작.
POLAR_PRODUCT_SMALL=<prod_...>
POLAR_PRODUCT_MEDIUM=<prod_...>
POLAR_PRODUCT_LARGE=<prod_...>
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore(billing): document Polar env vars in .env.example"
```

---

## Task 5: SKU 패키지 상수 + 테스트

**Files:**
- Create: `src/lib/billing/packages.ts`
- Test: `src/lib/billing/__tests__/packages.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/billing/__tests__/packages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CREDIT_PACKAGES, CREDIT_PACKAGE_IDS, type CreditPackageId } from '@/lib/billing/packages'

describe('CREDIT_PACKAGES', () => {
  it('contains exactly three SKUs: small / medium / large', () => {
    expect(CREDIT_PACKAGE_IDS).toEqual(['small', 'medium', 'large'])
  })

  it('every package has positive credits and a non-empty label', () => {
    for (const id of CREDIT_PACKAGE_IDS) {
      const pkg = CREDIT_PACKAGES[id]
      expect(pkg.credits).toBeGreaterThan(0)
      expect(pkg.label.length).toBeGreaterThan(0)
    }
  })

  it('credits scale strictly upward small < medium < large', () => {
    expect(CREDIT_PACKAGES.small.credits).toBeLessThan(CREDIT_PACKAGES.medium.credits)
    expect(CREDIT_PACKAGES.medium.credits).toBeLessThan(CREDIT_PACKAGES.large.credits)
  })

  it('CreditPackageId type accepts only the three SKUs', () => {
    const ok: CreditPackageId = 'medium'
    expect(ok).toBe('medium')
  })
})
```

- [ ] **Step 2: 실패 확인**

```
npm test -- packages.test
```

기대: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현**

`src/lib/billing/packages.ts`:

```ts
export const CREDIT_PACKAGES = {
  small:  { credits: 10,  label: '한 주 체험팩' },
  medium: { credits: 50,  label: '한 달 든든팩' },
  large:  { credits: 200, label: '헤비유저팩' },
} as const

export const CREDIT_PACKAGE_IDS = ['small', 'medium', 'large'] as const

export type CreditPackageId = typeof CREDIT_PACKAGE_IDS[number]
```

- [ ] **Step 4: 통과 확인**

```
npm test -- packages.test
```

기대: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/packages.ts src/lib/billing/__tests__/packages.test.ts
git commit -m "feat(billing): define 3-tier credit package constants"
```

---

## Task 6: `deriveCreditsFromProduct` + 테스트

**Files:**
- Create: `src/lib/billing/credits.ts`
- Test: `src/lib/billing/__tests__/credits.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/billing/__tests__/credits.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { deriveCreditsFromProduct } from '@/lib/billing/credits'

const ORIG = { ...process.env }

beforeEach(() => {
  process.env.POLAR_PRODUCT_SMALL  = 'prod_small_1'
  process.env.POLAR_PRODUCT_MEDIUM = 'prod_medium_1'
  process.env.POLAR_PRODUCT_LARGE  = 'prod_large_1'
})

afterEach(() => {
  process.env = { ...ORIG }
})

describe('deriveCreditsFromProduct', () => {
  it('maps each env product id to its package credits', () => {
    expect(deriveCreditsFromProduct('prod_small_1')).toBe(10)
    expect(deriveCreditsFromProduct('prod_medium_1')).toBe(50)
    expect(deriveCreditsFromProduct('prod_large_1')).toBe(200)
  })

  it('throws for unknown product id', () => {
    expect(() => deriveCreditsFromProduct('prod_unknown')).toThrow(/unknown product/i)
  })

  it('throws if an env var is missing', () => {
    delete process.env.POLAR_PRODUCT_MEDIUM
    expect(() => deriveCreditsFromProduct('prod_medium_1')).toThrow(/POLAR_PRODUCT_MEDIUM/)
  })
})
```

- [ ] **Step 2: 실패 확인**

```
npm test -- credits.test
```

기대: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현**

`src/lib/billing/credits.ts`:

```ts
import { CREDIT_PACKAGES, type CreditPackageId } from './packages'

const ENV_KEYS: Record<CreditPackageId, string> = {
  small:  'POLAR_PRODUCT_SMALL',
  medium: 'POLAR_PRODUCT_MEDIUM',
  large:  'POLAR_PRODUCT_LARGE',
}

export function deriveCreditsFromProduct(productId: string): number {
  for (const [sku, envKey] of Object.entries(ENV_KEYS) as [CreditPackageId, string][]) {
    const envValue = process.env[envKey]
    if (!envValue) throw new Error(`${envKey} is not set`)
    if (envValue === productId) return CREDIT_PACKAGES[sku].credits
  }
  throw new Error(`unknown product id: ${productId}`)
}

export function productIdFor(sku: CreditPackageId): string {
  const value = process.env[ENV_KEYS[sku]]
  if (!value) throw new Error(`${ENV_KEYS[sku]} is not set`)
  return value
}
```

- [ ] **Step 4: 통과 확인**

```
npm test -- credits.test
```

기대: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/credits.ts src/lib/billing/__tests__/credits.test.ts
git commit -m "feat(billing): map polar product ids to package credits with strict env check"
```

---

## Task 7: Polar REST fetch wrapper

**Files:**
- Create: `src/lib/billing/polar.ts`

테스트 없음 (얇은 wrapper). 호출자 측 테스트에서 fetch 주입으로 검증한다.

- [ ] **Step 1: 구현**

`src/lib/billing/polar.ts`:

```ts
import 'server-only'

const SANDBOX_BASE = 'https://sandbox-api.polar.sh'
const PROD_BASE    = 'https://api.polar.sh'

function baseUrl(): string {
  return process.env.POLAR_ENV === 'production' ? PROD_BASE : SANDBOX_BASE
}

function token(): string {
  const t = process.env.POLAR_ORG_TOKEN
  if (!t) throw new Error('POLAR_ORG_TOKEN is not set')
  return t
}

export interface PolarFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  fetchImpl?: typeof fetch
}

export async function polarFetch<T = unknown>(
  path: string,
  opts: PolarFetchOptions = {},
): Promise<T> {
  const f = opts.fetchImpl ?? fetch
  const res = await f(`${baseUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'authorization': `Bearer ${token()}`,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Polar ${opts.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing/polar.ts
git commit -m "feat(billing): add thin Polar REST fetch wrapper with sandbox/prod base"
```

---

## Task 8: Standard Webhooks 서명 검증 + 테스트

**Files:**
- Create: `src/lib/billing/webhook-signature.ts`
- Test: `src/lib/billing/__tests__/webhook-signature.test.ts`

Polar는 Standard Webhooks 스펙을 따른다: 헤더 `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64sig>` 공백 구분 가능). 서명 페이로드는 `${id}.${timestamp}.${body}`, key는 시크릿 `whsec_<base64>` 의 base64-디코딩된 raw bytes, HMAC-SHA256.

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/billing/__tests__/webhook-signature.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPolarSignature } from '@/lib/billing/webhook-signature'

const SECRET_RAW = Buffer.from('test-secret-bytes-1234567890abcdef', 'utf-8')
const SECRET = `whsec_${SECRET_RAW.toString('base64')}`

function sign(id: string, ts: string, body: string): string {
  const payload = `${id}.${ts}.${body}`
  const sig = createHmac('sha256', SECRET_RAW).update(payload).digest('base64')
  return `v1,${sig}`
}

describe('verifyPolarSignature', () => {
  const now = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({ type: 'order.paid', data: { id: 'o1' } })
  const id = 'msg_123'

  it('accepts a correctly signed payload', () => {
    const ok = verifyPolarSignature({ id, ts: now, body, sig: sign(id, now, body), secret: SECRET })
    expect(ok).toBe(true)
  })

  it('rejects a tampered body', () => {
    const sig = sign(id, now, body)
    const ok = verifyPolarSignature({ id, ts: now, body: body + 'x', sig, secret: SECRET })
    expect(ok).toBe(false)
  })

  it('rejects a stale timestamp (skew > 5 min)', () => {
    const stale = (Math.floor(Date.now() / 1000) - 60 * 10).toString()
    const ok = verifyPolarSignature({ id, ts: stale, body, sig: sign(id, stale, body), secret: SECRET })
    expect(ok).toBe(false)
  })

  it('rejects when sig header is missing', () => {
    expect(verifyPolarSignature({ id, ts: now, body, sig: '', secret: SECRET })).toBe(false)
  })

  it('accepts when one of multiple space-separated signatures matches', () => {
    const valid = sign(id, now, body)
    const sig = `v1,wrongwrongwrong ${valid}`
    expect(verifyPolarSignature({ id, ts: now, body, sig, secret: SECRET })).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인**

```
npm test -- webhook-signature.test
```

기대: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현**

`src/lib/billing/webhook-signature.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_SECONDS = 60 * 5

interface VerifyArgs {
  id: string
  ts: string
  body: string
  sig: string
  secret: string
}

export function verifyPolarSignature({ id, ts, body, sig, secret }: VerifyArgs): boolean {
  if (!id || !ts || !sig || !secret) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsNum) > MAX_SKEW_SECONDS) return false

  const rawSecret = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice('whsec_'.length), 'base64')
    : Buffer.from(secret, 'utf-8')

  const payload = `${id}.${ts}.${body}`
  const expected = createHmac('sha256', rawSecret).update(payload).digest('base64')

  // Standard Webhooks: 공백 구분 다중 시그니처, 각각 "v1,<base64>"
  for (const candidate of sig.split(' ')) {
    const [scheme, value] = candidate.split(',')
    if (scheme !== 'v1' || !value) continue
    const got = Buffer.from(value, 'base64')
    const exp = Buffer.from(expected, 'base64')
    if (got.length === exp.length && timingSafeEqual(got, exp)) return true
  }
  return false
}
```

- [ ] **Step 4: 통과 확인**

```
npm test -- webhook-signature.test
```

기대: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/webhook-signature.ts src/lib/billing/__tests__/webhook-signature.test.ts
git commit -m "feat(billing): verify Polar webhook HMAC with Standard Webhooks spec"
```

---

## Task 9: `consumeCredit` 헬퍼

**Files:**
- Create: `src/lib/billing/consume.ts`

server actions 안에서 cookie 세션의 일반 supabase client를 받아 RPC를 호출한다. RLS는 RPC가 `security definer`라 무관, 하지만 `auth.uid()`가 들어가야 하므로 일반 client를 통해 호출.

- [ ] **Step 1: 구현**

`src/lib/billing/consume.ts`:

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type ConsumeReason =
  | 'consume_daily' | 'consume_zodiac' | 'consume_tarot'
  | 'consume_dream' | 'consume_lotto'

export interface ConsumeArgs {
  supabase: SupabaseClient<Database>
  userId: string
  reason: ConsumeReason
  relatedKind?: string
  relatedId?: string
}

export class InsufficientCreditsError extends Error {
  constructor() { super('INSUFFICIENT_CREDITS'); this.name = 'InsufficientCreditsError' }
}

export async function consumeCredit(args: ConsumeArgs): Promise<number> {
  const { data, error } = await args.supabase.rpc('apply_credit_delta', {
    p_user_id: args.userId,
    p_delta: -1,
    p_reason: args.reason,
    p_polar_order_id: null,
    p_related_kind: args.relatedKind ?? null,
    p_related_id: args.relatedId ?? null,
  })
  if (error) {
    // RPC 가 `raise exception 'INSUFFICIENT_CREDITS'` 로 던지면 message 에 박힘.
    if ((error.message ?? '').includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError()
    }
    throw new Error(`apply_credit_delta failed: ${error.message}`)
  }
  return data as number
}

export function isInsufficient(e: unknown): e is InsufficientCreditsError {
  return e instanceof InsufficientCreditsError
    || (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS')
}
```

- [ ] **Step 2: Lint 확인**

```
npm run lint
```

기대: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing/consume.ts
git commit -m "feat(billing): add consumeCredit helper that maps RPC errors to typed exception"
```

---

## Task 10: `billing_log` 라이터

**Files:**
- Create: `src/lib/billing/log.ts`

`ai_call_log` 패턴 복제. 실패는 console.error만, 호출자 흐름 방해 X.

- [ ] **Step 1: 구현**

`src/lib/billing/log.ts`:

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type BillingEvent =
  | 'checkout_started' | 'webhook_received' | 'webhook_signature_invalid'
  | 'credit_applied' | 'error'

export interface LogArgs {
  supabase: SupabaseClient<Database>
  event: BillingEvent
  userId?: string | null
  payload?: Record<string, unknown>
  error?: string | null
}

export async function logBilling(args: LogArgs): Promise<void> {
  const { error } = await args.supabase.from('billing_log').insert({
    event: args.event,
    user_id: args.userId ?? null,
    payload: (args.payload ?? {}) as never,
    error: args.error ?? null,
  })
  if (error) console.error(`[billing_log/${args.event}] insert error:`, error)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing/log.ts
git commit -m "feat(billing): add billing_log writer mirroring ai_call_log pattern"
```

---

## Task 11: `getCreditBalance` 헬퍼

**Files:**
- Create: `src/lib/billing/balance.ts`

server components·layouts에서 잔액을 직접 read하는 단일 함수. RLS로 본인 row만.

- [ ] **Step 1: 구현**

`src/lib/billing/balance.ts`:

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function getCreditBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[getCreditBalance] error:', error)
    return 0
  }
  return data?.balance ?? 0
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/billing/balance.ts
git commit -m "feat(billing): add getCreditBalance helper for server components"
```

---

## Task 12: `startCheckout` server action

**Files:**
- Create: `src/app/actions/billing.ts`

`customer_external_id`로 user.id를, `metadata.user_id`도 함께 전달 (디버깅·추적용). 실제 신뢰는 `external_id`와 `product_id` 매핑에 둔다.

- [ ] **Step 1: 구현**

`src/app/actions/billing.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { polarFetch } from '@/lib/billing/polar'
import { productIdFor } from '@/lib/billing/credits'
import { logBilling } from '@/lib/billing/log'
import { CREDIT_PACKAGES, type CreditPackageId, CREDIT_PACKAGE_IDS } from '@/lib/billing/packages'

interface CheckoutResponse {
  url: string
  id: string
}

export async function startCheckout(sku: CreditPackageId): Promise<never> {
  if (!CREDIT_PACKAGE_IDS.includes(sku)) throw new Error('INVALID_SKU')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')

  const productId = productIdFor(sku)
  const credits = CREDIT_PACKAGES[sku].credits
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not set')

  try {
    const checkout = await polarFetch<CheckoutResponse>('/v1/checkouts/', {
      method: 'POST',
      body: {
        products: [productId],
        customer_external_id: user.id,
        customer_email: user.email,
        success_url: `${siteUrl}/billing/success?checkout_id={CHECKOUT_ID}`,
        metadata: { sku, credits: String(credits), user_id: user.id },
      },
    })
    await logBilling({
      supabase, event: 'checkout_started', userId: user.id,
      payload: { sku, credits, checkout_id: checkout.id, product_id: productId },
    })
    redirect(checkout.url)
  } catch (e) {
    if (isNextRedirect(e)) throw e
    await logBilling({
      supabase, event: 'error', userId: user.id,
      payload: { phase: 'checkout_create', sku },
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }
}

// Next.js redirect() 는 NEXT_REDIRECT 에러로 던져진다 — 정상 흐름.
function isNextRedirect(e: unknown): boolean {
  return e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT') === true
}
```

- [ ] **Step 2: Lint**

```
npm run lint
```

기대: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/billing.ts
git commit -m "feat(billing): add startCheckout server action that creates Polar checkout"
```

---

## Task 13: `consumeCredit` 통합 — `fortune.ts` (daily / zodiac / lotto)

**Files:**
- Modify: `src/app/actions/fortune.ts`

캐시 hit (`fortune_daily` / `lotto_recommendations` 동일 row 존재)이면 차감 skip. 캐시 miss → AI 호출 직전에 `consumeCredit` 호출. AI 호출 실패 시 차감을 되돌리지 않는다 (운영 결정: 의도된 클릭 = 비용 인정).

- [ ] **Step 1: 변경 적용**

`src/app/actions/fortune.ts`에서 3개 함수를 다음과 같이 수정.

`getDailyFortune` (line 33–68 영역):

```ts
export async function getDailyFortune(viewer?: ViewerProfile): Promise<DailyContent> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()

  if (!viewer) {
    const { data, error } = await supabase
      .from('fortune_daily')
      .select('content')
      .match({ user_id: user.id, date: today, fortune_type: 'daily' })
      .limit(1)
    if (error) console.error('[fortune_daily/daily] select error:', error)
    if (data && data.length > 0) return data[0].content as unknown as DailyContent

    // 캐시 miss + 본인 호출 = 크레딧 1 차감
    await consumeCredit({ supabase, userId: user.id, reason: 'consume_daily', relatedKind: 'daily', relatedId: today })
  }

  const result = await callFortuneModel<DailyContent>({
    // ... 기존 그대로
  })
  // ... 기존 insert 분기 그대로
  return result
}
```

`getZodiacFortune` (line 70–116 영역): 동일 패턴 — 캐시 select 후 데이터 없으면 `reason: 'consume_zodiac'`, relatedId=today로 `consumeCredit` 호출.

`getLottoRec` (line 118–167 영역): 캐시 select 후 데이터 없으면 `reason: 'consume_lotto'`, relatedId=String(drawNumber)로 `consumeCredit` 호출.

import 라인 추가:

```ts
import { consumeCredit, InsufficientCreditsError } from '@/lib/billing/consume'
```

- [ ] **Step 2: viewer 모드 보호**

viewer 인자가 있을 때(다른 사람 운세 조회 = `/lookup`)는 차감하지 않는다. 위 코드 패턴에서 `if (!viewer) { ... consumeCredit ... }` 안에 둠으로써 이미 보장됨. lookup 기능은 무료 유지.

- [ ] **Step 3: lint·test**

```
npm run lint && npm test
```

기대: 기존 테스트 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/fortune.ts
git commit -m "feat(billing): charge 1 credit per fortune AI call (daily/zodiac/lotto)"
```

---

## Task 14: `consumeCredit` 통합 — `tarot.ts`

**Files:**
- Modify: `src/app/actions/tarot.ts`

타로는 캐시 없음 → 매 호출 차감. 3장·1장 모두 `reason: 'consume_tarot'` (ledger reason은 통일, 운영 구분은 `related_kind` 로 'tarot_three' / 'tarot_one').

- [ ] **Step 1: 변경 적용**

`getTarotReading` 내부, AI 호출 직전에:

```ts
await consumeCredit({
  supabase, userId: user.id, reason: 'consume_tarot',
  relatedKind: 'tarot_three',
})
```

`getTarotOneCardReading` 내부, AI 호출 직전에:

```ts
await consumeCredit({
  supabase, userId: user.id, reason: 'consume_tarot',
  relatedKind: 'tarot_one',
})
```

import 추가:

```ts
import { consumeCredit } from '@/lib/billing/consume'
```

- [ ] **Step 2: lint·test**

```
npm run lint && npm test
```

기대: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/tarot.ts
git commit -m "feat(billing): charge 1 credit per tarot reading (3-card and 1-card)"
```

---

## Task 15: `consumeCredit` 통합 — `dream.ts`

**Files:**
- Modify: `src/app/actions/dream.ts`

기존 `DreamActionResult` 가 `{ ok: false; error: string }` 패턴이라 자연스럽게 INSUFFICIENT_CREDITS 케이스를 추가. 단, 클라이언트에서 모달과 일반 에러를 구분할 수 있도록 `code` 필드 추가.

- [ ] **Step 1: 타입 확장**

```ts
export type DreamActionResult =
  | { ok: true; persona: DreamPersonaKey; data: DreamInterpretation }
  | { ok: false; error: string; code?: 'INSUFFICIENT_CREDITS' }
```

- [ ] **Step 2: 차감 호출 추가**

`getDreamInterpretation` 안, 프로필 조회 직후 + `usagePromise` 시작 직전에:

```ts
try {
  await consumeCredit({
    supabase, userId: user.id, reason: 'consume_dream',
    relatedKind: input.persona,
  })
} catch (e) {
  if (isInsufficient(e)) {
    return { ok: false, error: '크레딧이 부족해요', code: 'INSUFFICIENT_CREDITS' }
  }
  throw e
}
```

import 추가:

```ts
import { consumeCredit, isInsufficient } from '@/lib/billing/consume'
```

- [ ] **Step 3: lint·test**

```
npm run lint && npm test
```

기대: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/dream.ts
git commit -m "feat(billing): charge 1 credit per dream interpretation"
```

---

## Task 16: 웹훅 라우트 + 테스트

**Files:**
- Create: `src/app/api/polar/webhook/route.ts`
- Test: `src/lib/billing/__tests__/webhook-route.test.ts`

`createAdminClient()` 사용 (service role). 본 라우트는 일반 사용자 세션이 없으므로 service key가 필수.

`verifyPolarSignature`가 검증, 그 뒤 `order.paid`만 처리, `deriveCreditsFromProduct(order.product_id)`로 크레딧 수 결정, RPC가 idempotent 보장.

테스트는 핸들러 함수를 직접 호출해 Request mock을 넘긴다. service role admin client는 인터페이스 함수로 주입 가능하도록 작성.

- [ ] **Step 1: 라우트 구현**

`src/app/api/polar/webhook/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPolarSignature } from '@/lib/billing/webhook-signature'
import { deriveCreditsFromProduct } from '@/lib/billing/credits'
import { logBilling } from '@/lib/billing/log'

interface PolarOrder {
  id: string
  product_id: string
  customer: { external_id?: string | null }
  metadata?: Record<string, string>
}

interface PolarEvent {
  type: string
  data: PolarOrder
}

export async function POST(req: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) return new NextResponse('config missing', { status: 500 })

  const body = await req.text()
  const id  = req.headers.get('webhook-id') ?? ''
  const ts  = req.headers.get('webhook-timestamp') ?? ''
  const sig = req.headers.get('webhook-signature') ?? ''

  const admin = createAdminClient()

  if (!verifyPolarSignature({ id, ts, body, sig, secret })) {
    await logBilling({ supabase: admin, event: 'webhook_signature_invalid', payload: { id } })
    return new NextResponse('invalid signature', { status: 401 })
  }

  let event: PolarEvent
  try { event = JSON.parse(body) as PolarEvent }
  catch { return new NextResponse('invalid json', { status: 400 }) }

  await logBilling({ supabase: admin, event: 'webhook_received', payload: { id, type: event.type } })

  if (event.type !== 'order.paid') {
    return new NextResponse('ignored', { status: 200 })
  }

  const order = event.data
  const userId = order.customer?.external_id
  if (!userId) {
    await logBilling({ supabase: admin, event: 'error',
      payload: { phase: 'webhook', order_id: order.id }, error: 'missing external_id' })
    return new NextResponse('ok', { status: 200 })  // Polar 재시도 막기
  }

  let credits: number
  try { credits = deriveCreditsFromProduct(order.product_id) }
  catch (e) {
    await logBilling({ supabase: admin, event: 'error',
      payload: { phase: 'webhook', order_id: order.id, product_id: order.product_id },
      error: e instanceof Error ? e.message : String(e) })
    return new NextResponse('ok', { status: 200 })
  }

  const { error } = await admin.rpc('apply_credit_delta', {
    p_user_id: userId,
    p_delta: credits,
    p_reason: 'purchase',
    p_polar_order_id: order.id,
    p_related_kind: null,
    p_related_id: null,
  })

  if (error) {
    await logBilling({ supabase: admin, event: 'error', userId,
      payload: { phase: 'webhook_rpc', order_id: order.id }, error: error.message })
    return new NextResponse('rpc failed', { status: 500 })  // Polar 재시도 유도
  }

  await logBilling({ supabase: admin, event: 'credit_applied', userId,
    payload: { source: 'webhook', order_id: order.id, credits } })
  return new NextResponse('ok', { status: 200 })
}
```

- [ ] **Step 2: 테스트 작성 (서명 검증만 핸들러 단위로 — DB는 admin client mock)**

`src/lib/billing/__tests__/webhook-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

// admin client mock
const insertMock = vi.fn().mockResolvedValue({ error: null })
const rpcMock    = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ insert: insertMock }),
    rpc: rpcMock,
  }),
}))

const SECRET_RAW = Buffer.from('test-secret-bytes-1234567890abcdef', 'utf-8')
const SECRET = `whsec_${SECRET_RAW.toString('base64')}`

beforeEach(() => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  process.env.POLAR_PRODUCT_SMALL  = 'prod_small_1'
  process.env.POLAR_PRODUCT_MEDIUM = 'prod_medium_1'
  process.env.POLAR_PRODUCT_LARGE  = 'prod_large_1'
  insertMock.mockClear()
  rpcMock.mockClear()
})

function makeReq(bodyObj: unknown, opts?: { tamper?: boolean; staleTs?: boolean }) {
  const body = JSON.stringify(bodyObj)
  const id = 'msg_1'
  const ts = opts?.staleTs
    ? String(Math.floor(Date.now() / 1000) - 60 * 30)
    : String(Math.floor(Date.now() / 1000))
  const sig = `v1,${createHmac('sha256', SECRET_RAW).update(`${id}.${ts}.${body}`).digest('base64')}`
  const transmitted = opts?.tamper ? body + 'x' : body
  return new Request('http://localhost/api/polar/webhook', {
    method: 'POST',
    headers: {
      'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': sig,
      'content-type': 'application/json',
    },
    body: transmitted,
  })
}

describe('POST /api/polar/webhook', () => {
  it('returns 401 on invalid signature', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.paid', data: { id: 'o1' } }, { tamper: true })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 and calls RPC on valid order.paid', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({
      type: 'order.paid',
      data: {
        id: 'order_abc',
        product_id: 'prod_medium_1',
        customer: { external_id: '00000000-0000-0000-0000-000000000001' },
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('apply_credit_delta', expect.objectContaining({
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_delta: 50,
      p_reason: 'purchase',
      p_polar_order_id: 'order_abc',
    }))
  })

  it('ignores non-order.paid events with 200', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.created', data: { id: 'o1' } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 without RPC when external_id missing', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({
      type: 'order.paid',
      data: { id: 'order_z', product_id: 'prod_small_1', customer: {} },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 401 on stale timestamp', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.paid', data: { id: 'o1' } }, { staleTs: true })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3: 테스트 실행**

```
npm test -- webhook-route.test
```

기대: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/polar/webhook/route.ts src/lib/billing/__tests__/webhook-route.test.ts
git commit -m "feat(billing): handle Polar order.paid webhook with idempotent credit grant"
```

---

## Task 17: `CreditPackageCard` 컴포넌트

**Files:**
- Create: `src/components/billing/credit-package-card.tsx`

client component. form action으로 `startCheckout(sku)` 호출 → 서버에서 redirect.

- [ ] **Step 1: 구현**

`src/components/billing/credit-package-card.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CREDIT_PACKAGES, type CreditPackageId } from '@/lib/billing/packages'
import { startCheckout } from '@/app/actions/billing'

interface Props {
  sku: CreditPackageId
  price: string          // 표시용 ("$1.99")
  discountLabel?: string // "-20% off"
  featured?: boolean     // Medium에 true
}

export function CreditPackageCard({ sku, price, discountLabel, featured }: Props) {
  const [pending, start] = useTransition()
  const pkg = CREDIT_PACKAGES[sku]

  const onSubmit = () => start(async () => { await startCheckout(sku) })

  return (
    <article
      className={[
        'relative flex flex-col gap-3 rounded-2xl border bg-fortune-canvas p-6',
        'shadow-[0_1px_4px_0_rgba(20,22,26,0.3)]',
        featured ? 'border-2 border-fortune-primary' : 'border border-fortune-hairline-soft',
      ].join(' ')}
    >
      {featured && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-fortune-attention px-2.5 py-1 text-[0.75rem] font-bold text-fortune-canvas">
          Most popular
        </span>
      )}
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-fortune-ink-deep">{pkg.label}</h3>
        {discountLabel && (
          <span className="rounded-full bg-fortune-warning px-2.5 py-1 text-[0.75rem] font-bold text-fortune-ink-deep">
            {discountLabel}
          </span>
        )}
      </header>
      <div className="text-[64px] leading-[1.16] font-medium text-fortune-ink-deep">
        {pkg.credits}
      </div>
      <div className="-mt-2 text-sm text-fortune-charcoal">크레딧</div>
      <div className="text-[36px] leading-[1.28] font-medium text-fortune-ink-deep">{price}</div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        variant="buyCta"
        size="pill"
        className="mt-2 w-full"
      >
        {pending ? '이동 중…' : '충전'}
      </Button>
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/billing/credit-package-card.tsx
git commit -m "feat(billing): add CreditPackageCard with cobalt buy-now CTA"
```

---

## Task 18: `/billing` 페이지

**Files:**
- Create: `src/app/billing/page.tsx`

server component. 잔액 + 3개 카드.

- [ ] **Step 1: 구현**

`src/app/billing/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/billing/balance'
import { CreditPackageCard } from '@/components/billing/credit-package-card'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const balance = await getCreditBalance(supabase, user.id)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[48px] leading-[1.17] font-medium text-fortune-ink-deep">
            크레딧 충전
          </h1>
          <p className="text-lg leading-[1.44] text-fortune-charcoal">
            AI 운세 호출 1회당 크레딧 1개가 사용돼요.
          </p>
        </div>
        <div className="rounded-full bg-fortune-surface-soft px-4 py-2 text-sm font-bold text-fortune-ink-deep">
          현재 잔액 {balance} 크레딧
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <CreditPackageCard sku="small"  price="$1.99" />
        <CreditPackageCard sku="medium" price="$7.99" discountLabel="-20% off" featured />
        <CreditPackageCard sku="large"  price="$24.99" discountLabel="-37% off" />
      </section>

      <footer className="text-xs text-fortune-steel">
        Sandbox 테스트: 카드번호 4242 4242 4242 4242 · 어떤 미래 만료일·CVC도 OK
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: 로컬 dev 확인 (가능하면)**

```
npm run dev
```

브라우저에서 `/billing` 접속 → 잔액 + 3개 카드 표시. "충전" 클릭 시 env 미설정이면 server action에서 throw.

- [ ] **Step 3: Commit**

```bash
git add src/app/billing/page.tsx
git commit -m "feat(billing): add /billing page with 3-tier credit packages"
```

---

## Task 19: `PurchaseSuccessCard` 컴포넌트

**Files:**
- Create: `src/components/billing/purchase-success-card.tsx`

- [ ] **Step 1: 구현**

`src/components/billing/purchase-success-card.tsx`:

```tsx
import Link from 'next/link'
import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  creditsAdded: number | null  // null = 확인 불가 (Polar API 실패 등)
  newBalance: number
}

export function PurchaseSuccessCard({ creditsAdded, newBalance }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-10 text-center">
      <CircleCheck className="size-16 text-fortune-success" />
      <h1 className="text-[36px] leading-[1.28] font-medium text-fortune-ink-deep">
        {creditsAdded != null ? '충전이 완료됐어요' : '결제 확인 중이에요'}
      </h1>
      {creditsAdded != null && (
        <p className="text-2xl font-light text-fortune-charcoal">+{creditsAdded} 크레딧 적립</p>
      )}
      <p className="text-base text-fortune-ink">현재 잔액: {newBalance} 크레딧</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="pill" variant="default" className="bg-fortune-ink-button text-fortune-canvas">
          <Link href="/">운세 보러 가기</Link>
        </Button>
        <Button asChild size="pill" variant="ghostInk">
          <Link href="/billing">충전 페이지로</Link>
        </Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/billing/purchase-success-card.tsx
git commit -m "feat(billing): add PurchaseSuccessCard with credit confirmation"
```

---

## Task 20: `/billing/success` 페이지 (idempotent fallback 적립)

**Files:**
- Create: `src/app/billing/success/page.tsx`

웹훅이 늦더라도 success 페이지에서 즉시 Polar API로 paid 확인 → 같은 RPC 호출. `polar_order_id UNIQUE` 가 idempotency 보장.

- [ ] **Step 1: 구현**

`src/app/billing/success/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { polarFetch } from '@/lib/billing/polar'
import { deriveCreditsFromProduct } from '@/lib/billing/credits'
import { getCreditBalance } from '@/lib/billing/balance'
import { logBilling } from '@/lib/billing/log'
import { PurchaseSuccessCard } from '@/components/billing/purchase-success-card'

export const dynamic = 'force-dynamic'

interface PolarCheckoutResp {
  status: string
  customer_external_id: string | null
  product_id: string
  order_id: string | null
}

export default async function SuccessPage(
  { searchParams }: { searchParams: Promise<{ checkout_id?: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { checkout_id: checkoutId } = await searchParams
  let creditsAdded: number | null = null

  if (checkoutId) {
    try {
      const checkout = await polarFetch<PolarCheckoutResp>(`/v1/checkouts/${checkoutId}`)
      const orderId = checkout.order_id
      if (checkout.status === 'succeeded' && orderId && checkout.customer_external_id === user.id) {
        const credits = deriveCreditsFromProduct(checkout.product_id)
        const admin = createAdminClient()
        const { error } = await admin.rpc('apply_credit_delta', {
          p_user_id: user.id,
          p_delta: credits,
          p_reason: 'purchase',
          p_polar_order_id: orderId,
          p_related_kind: null,
          p_related_id: null,
        })
        if (error) {
          await logBilling({ supabase: admin, event: 'error', userId: user.id,
            payload: { phase: 'success_rpc', checkout_id: checkoutId },
            error: error.message })
        } else {
          await logBilling({ supabase: admin, event: 'credit_applied', userId: user.id,
            payload: { source: 'success_url', order_id: orderId, credits } })
          creditsAdded = credits
        }
      }
    } catch (e) {
      console.error('[billing/success] checkout fetch failed:', e)
    }
  }

  const newBalance = await getCreditBalance(supabase, user.id)

  return (
    <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-16">
      <PurchaseSuccessCard creditsAdded={creditsAdded} newBalance={newBalance} />
    </main>
  )
}
```

- [ ] **Step 2: lint**

```
npm run lint
```

기대: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/billing/success/page.tsx
git commit -m "feat(billing): add /billing/success page with idempotent fallback grant"
```

---

## Task 21: `CreditBadge` + `AppHeader` 통합

**Files:**
- Create: `src/components/billing/credit-badge.tsx`
- Modify: `src/components/fortune/app-header.tsx`

server component. 잔액 ≥ 1 → success 톤, =0 → attention 톤 + 충전 링크.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/billing/credit-badge.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/billing/balance'

export async function CreditBadge() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const balance = await getCreditBalance(supabase, user.id)
  const empty = balance <= 0

  return (
    <Link
      href="/billing"
      aria-label={`크레딧 ${balance}개. 충전 페이지로`}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        empty
          ? 'bg-fortune-attention text-fortune-canvas'
          : 'bg-fortune-success text-fortune-canvas',
      ].join(' ')}
    >
      <span aria-hidden>●</span>
      <span>{balance}</span>
      {empty && <span className="hidden sm:inline">· 충전</span>}
    </Link>
  )
}
```

- [ ] **Step 2: AppHeader 수정**

`src/components/fortune/app-header.tsx`:

```tsx
import Link from 'next/link'
import { Settings, User } from 'lucide-react'
import { CreditBadge } from '@/components/billing/credit-badge'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <Link href="/" aria-label="홈" className="text-lg font-bold tracking-tight text-fortune-ink-deep">
        운세
      </Link>
      <div className="flex items-center gap-2">
        <CreditBadge />
        <Link
          href="/settings"
          aria-label="설정"
          className="size-11 rounded-full inline-flex items-center justify-center"
        >
          <Settings className="size-5.5 text-fortune-ink-deep" />
        </Link>
        <Link
          href="/me"
          aria-label="내 정보"
          className="size-11 rounded-full inline-flex items-center justify-center"
        >
          <User className="size-5.5 text-fortune-ink-deep" />
        </Link>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: lint·test**

```
npm run lint && npm test
```

기대: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/billing/credit-badge.tsx src/components/fortune/app-header.tsx
git commit -m "feat(billing): show credit balance badge in app header"
```

---

## Task 22: `InsufficientCreditsDialog` 컴포넌트

**Files:**
- Create: `src/components/billing/insufficient-credits-dialog.tsx`

Radix Dialog. 외부에서 `open` / `onOpenChange` 제어.

- [ ] **Step 1: 구현**

`src/components/billing/insufficient-credits-dialog.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function InsufficientCreditsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-6 shadow-lg"
        >
          <Dialog.Title className="text-lg font-bold text-fortune-ink-deep">
            크레딧이 부족해요
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-base leading-[1.5] text-fortune-charcoal">
            이 운세를 보려면 크레딧 1개가 필요해요. 지금 충전하면 바로 이어서 볼 수 있어요.
          </Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="pillSm" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button asChild variant="buyCta" size="pillSm">
              <Link href="/billing">충전하러 가기</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/billing/insufficient-credits-dialog.tsx
git commit -m "feat(billing): add InsufficientCreditsDialog modal"
```

---

## Task 23: INSUFFICIENT_CREDITS UX 연결

**Files:**
- Create: `src/components/billing/needs-credits-card.tsx`
- Modify: `src/app/page.tsx` (server-side catch in DailyCard/ZodiacCard/LottoCard)
- Modify: `src/app/tarot/result/page.tsx` (server-side catch in ThreeCard/OneCard sections)
- Modify: `src/components/fortune/dream-form.tsx` (client Dialog 분기)

> **실제 아키텍처 주의:** 홈페이지(`src/app/page.tsx`)와 타로 결과 페이지(`src/app/tarot/result/page.tsx`)는 server component에서 AI server action을 eager call 한다. 클라이언트 모달 패턴은 작동하지 않는다 — 서버 렌더 시점에 다른 카드(`<NeedsCreditsCard/>`)를 그려야 한다. dream-form만 client form-driven 이라 `<InsufficientCreditsDialog/>` 모달 패턴이 맞다.

- [ ] **Step 1: `<NeedsCreditsCard/>` 컴포넌트 생성**

`src/components/billing/needs-credits-card.tsx`:

```tsx
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface Props {
  label: string  // "오늘의 운세" / "띠 · 별자리" / ...
}

export function NeedsCreditsCard({ label }: Props) {
  return (
    <section className="rounded-[32px] border border-fortune-primary/40 bg-fortune-primary-soft/15 p-6 flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        <span className="size-9 rounded-full inline-flex items-center justify-center bg-fortune-primary/15 text-fortune-primary-deep">
          <Sparkles className="size-5" />
        </span>
        <span className="text-2xl font-medium text-fortune-ink-deep">{label}</span>
      </header>
      <p className="text-sm text-fortune-charcoal">
        크레딧이 부족해서 새 해석을 불러올 수 없어요. 충전하면 바로 이어서 볼 수 있어요.
      </p>
      <Link
        href="/billing"
        className="inline-flex w-fit items-center rounded-full bg-fortune-primary px-5 py-2.5 text-sm font-bold text-fortune-canvas"
      >
        충전하러 가기
      </Link>
    </section>
  )
}
```

- [ ] **Step 2: `page.tsx` 3개 카드 catch 분기**

`src/app/page.tsx`의 `DailyCard`/`ZodiacCard`/`LottoCard` 각각에 `InsufficientCreditsError` import + 분기:

```ts
import { isInsufficient } from '@/lib/billing/consume'
import { NeedsCreditsCard } from '@/components/billing/needs-credits-card'
```

`DailyCard` 수정:

```tsx
async function DailyCard() {
  try {
    const data = await getDailyFortune()
    return <FortuneCardDaily data={data} />
  } catch (e) {
    if (isInsufficient(e)) return <NeedsCreditsCard label="오늘의 운세" />
    console.error('[DailyCard] failed:', e)
    return <ErrorCard label="오늘의 운세" />
  }
}
```

`ZodiacCard` 동일 패턴, label `"띠 · 별자리"`. `LottoCard` 동일, label `"행운의 로또번호"`.

- [ ] **Step 3: `tarot/result/page.tsx` 2개 섹션 catch 분기**

`ThreeCardReadingSection` 의 `catch (e)` 블록 안에서:

```tsx
} catch (e) {
  if (isInsufficient(e)) return <NeedsCreditsCard label="타로 3장 해석" />
  console.error('[tarot/result/three] reading failed:', e)
  return <ReadingError />
}
```

`OneCardReadingSection` 동일, label `"오늘의 타로"`.

import 두 줄 추가:

```ts
import { isInsufficient } from '@/lib/billing/consume'
import { NeedsCreditsCard } from '@/components/billing/needs-credits-card'
```

- [ ] **Step 4: `dream-form.tsx` 에 Dialog 연결**

`src/components/fortune/dream-form.tsx`:

state 추가:

```tsx
const [needsCredits, setNeedsCredits] = useState(false)
```

`submit` 함수 내 `if (!res.ok) ...` 분기 교체:

```tsx
if (!res.ok) {
  if (res.code === 'INSUFFICIENT_CREDITS') setNeedsCredits(true)
  else setError(res.error)
  return
}
```

JSX 최상위 fragment 안에 추가:

```tsx
<InsufficientCreditsDialog open={needsCredits} onOpenChange={setNeedsCredits} />
```

import 추가:

```tsx
import { InsufficientCreditsDialog } from '@/components/billing/insufficient-credits-dialog'
```

- [ ] **Step 5: lint·test**

```
npm run lint && npm test
```

기대: 기존 테스트 + 새로 추가된 unit/integration 전부 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/billing/needs-credits-card.tsx \
        src/app/page.tsx \
        src/app/tarot/result/page.tsx \
        src/components/fortune/dream-form.tsx
git commit -m "feat(billing): render NeedsCreditsCard on server, dialog in dream form"
```

---

## Task 24: Polar Sandbox 셋업 (MCP)

Polar Sandbox에 3개 product와 1개 webhook endpoint를 생성하고, 결과 ID/secret을 운영자에게 안내.

**Files:** (코드 변경 없음)

> **Pre-req:** `.env.local`에 `POLAR_ORG_TOKEN`이 이미 들어가 있어야 한다. Sandbox 대시보드(sandbox.polar.sh)에서 Settings → Developers → New Token 발급.

- [ ] **Step 1: small 상품 생성**

MCP `polar_products_create`:
```json
{
  "name": "Momentum Credits — Small",
  "description": "10 AI fortune credits",
  "recurring_interval": null,
  "prices": [{ "amount_type": "fixed", "price_amount": 199, "price_currency": "usd" }],
  "metadata": { "credits": "10", "sku": "small" }
}
```

반환값에서 `id` 기록.

- [ ] **Step 2: medium 상품 생성**

```json
{
  "name": "Momentum Credits — Medium",
  "description": "50 AI fortune credits (Most popular)",
  "recurring_interval": null,
  "prices": [{ "amount_type": "fixed", "price_amount": 799, "price_currency": "usd" }],
  "metadata": { "credits": "50", "sku": "medium" }
}
```

- [ ] **Step 3: large 상품 생성**

```json
{
  "name": "Momentum Credits — Large",
  "description": "200 AI fortune credits",
  "recurring_interval": null,
  "prices": [{ "amount_type": "fixed", "price_amount": 2499, "price_currency": "usd" }],
  "metadata": { "credits": "200", "sku": "large" }
}
```

- [ ] **Step 4: 웹훅 엔드포인트 생성**

MCP `polar_webhooks_create_webhook_endpoint`:
```json
{
  "url": "https://<your-vercel-domain>/api/polar/webhook",
  "events": ["order.created", "order.paid", "order.refunded"],
  "format": "raw"
}
```

반환값에서 `secret` (whsec_…) 기록.

- [ ] **Step 5: env 등록 (로컬 + Vercel)**

`.env.local`:
```
POLAR_ORG_TOKEN=<발급된 토큰>
POLAR_WEBHOOK_SECRET=<step 4 의 secret>
POLAR_ENV=sandbox
POLAR_PRODUCT_SMALL=<step 1 id>
POLAR_PRODUCT_MEDIUM=<step 2 id>
POLAR_PRODUCT_LARGE=<step 3 id>
```

Vercel 대시보드 → Project → Settings → Environment Variables 에도 동일 5개 등록 (또는 `vercel env add` 사용 — CLI 미설치 안내).

- [ ] **Step 6: 커밋 없음** — 모두 외부 상태.

---

## Task 25: 종합 검증 (수동 e2e)

**Files:** (코드 변경 없음)

- [ ] **Step 1: 단위 테스트 전체 실행**

```
npm test
```

기대: 이전 27개 + 새로 추가된 모든 케이스 PASS. 실패 시 해당 task로 회귀.

- [ ] **Step 2: lint·build**

```
npm run lint
npm run build
```

기대: PASS.

- [ ] **Step 3: Vercel 프리뷰 배포 또는 production 배포**

`vercel:deploy` 스킬로 production 배포 (혹은 git push 후 Vercel auto-deploy 대기). 배포 도메인 확인.

- [ ] **Step 4: 새 Supabase 사용자 생성**

브라우저(시크릿 창) → 배포 도메인 → Google/Kakao 로그인 → 온보딩 완료(이름·생일·성별). 헤더에 **🟢 5 크레딧** 표시 확인.

- [ ] **Step 5: 일일운세 1회 호출**

홈에서 일일운세 카드 펼침 → 호출 → 헤더 **🟢 4 크레딧**.

- [ ] **Step 6: 잔액 소진**

띄별/타로/꿈해몽/로또 차례로 호출하며 0까지 소진. 마지막 호출에서 헤더 **🟡 0 크레딧 · 충전**.

- [ ] **Step 7: 빈 잔액으로 호출 시도 → 모달**

운세 호출 → `InsufficientCreditsDialog` 모달. "충전하러 가기" → `/billing`.

- [ ] **Step 8: Medium 패키지 구매**

Medium 카드 → "충전" → Polar Sandbox 페이지 → `4242 4242 4242 4242` / 미래 만료일 / 임의 CVC / 임의 이름 → Pay → `/billing/success` 도착.

기대: success 페이지에 "+50 크레딧 적립" + "현재 잔액: 50 크레딧". 헤더 동기화.

- [ ] **Step 9: 웹훅 idempotency 검증**

Polar Sandbox 대시보드 → Webhooks → 방금 도착한 deliveries → 같은 event "Resend". 헤더·DB 잔액은 변함 없어야 함.

MCP `execute_sql`:
```sql
select count(*) from public.credit_ledger
where polar_order_id = '<주문 id>';
-- 기대: 1
```

- [ ] **Step 10: 모바일 viewport 검증**

브라우저 devtools → 375×667 (iPhone SE) → `/billing` 진입 → 3개 카드가 1-up 세로 스택. `InsufficientCreditsDialog`가 폭에 맞게 표시.

- [ ] **Step 11: 보안 spot-check**

브라우저 콘솔 또는 curl로 `/api/polar/webhook` 에 잘못된 서명으로 POST → **401 invalid signature**. `billing_log`에 `webhook_signature_invalid` 1 row.

```bash
curl -X POST https://<domain>/api/polar/webhook \
  -H "webhook-id: x" -H "webhook-timestamp: $(date +%s)" \
  -H "webhook-signature: v1,fake" \
  -d '{}'
```

- [ ] **Step 12: 최종 커밋 (없음)** — Task 21–24 모두 커밋 완료 상태. 마지막은 검증.

---

## Known Deferrals (spec § Phase 2 이후)

이 플랜이 의도적으로 구현하지 않는 항목 — spec 작성 시 합의된 Phase 2 범위:

- **서버사이드 rate limit**: spec §9에 언급된 "분당 5회 토큰 버킷"은 미구현. Phase 1은 `CreditPackageCard`의 `pending` 상태로 클라이언트측 더블 클릭만 방지. 서버 측 보호는 Vercel Runtime Cache 기반 persistent limiter로 Phase 2에서 추가.
- **환불 알림 UI**: `order.refunded` 웹훅은 ledger에 음수 row만 남기고 사용자 알림 없음. 운영 대시보드(Phase 2)에서만 확인.
- **운영 대시보드**: `/admin`에서 `billing_log`/`credit_ledger` 직접 조회·정정. Phase 2.
- **KRW 통화**: Polar Sandbox는 USD만으로 검증. Phase 2에서 다국가 통화 검토.
- **Customer Portal**: 일회성 결제만 다루므로 Polar Customer Portal 통합 불필요 (구독 Phase에서 추가).

## 완료 기준

- ✅ `user_credits` / `credit_ledger` / `billing_log` 테이블 존재, RLS 적용
- ✅ 가입 트리거로 신규 사용자 5 크레딧 자동 적립
- ✅ AI 호출 6개(daily/zodiac/lotto/tarot_three/tarot_one/dream) 모두 차감
- ✅ 잔액 0에서 호출 시 `InsufficientCreditsDialog` 노출
- ✅ `/billing` 페이지에서 3-tier 패키지 표시, "충전" → Polar Sandbox 호스티드 페이지
- ✅ 결제 후 `/billing/success` 에서 +N 크레딧 표시
- ✅ 웹훅 도착 시 같은 order는 한 번만 적립 (idempotency)
- ✅ 웹훅 서명 위조 시 401 + log 기록
- ✅ 모바일 viewport에서 카드 1-up 스택
- ✅ `npm test`, `npm run lint`, `npm run build` 전부 PASS
