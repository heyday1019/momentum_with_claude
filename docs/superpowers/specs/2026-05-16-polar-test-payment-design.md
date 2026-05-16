# Polar Sandbox 테스트 결제 시스템 설계

- 작성일: 2026-05-16
- 작성자: heyday1019@gmail.com (with Claude)
- 상태: Draft (사용자 리뷰 대기)

## 1. 배경과 목적

`momentum`은 한국어 운세 SaaS로 현재 5개 AI 기능(일일운세·띄별·타로·꿈해몽·로또)을 OpenRouter Claude Haiku로 무료 제공하고 있다. AI 호출 비용 부담을 해소하고 결제 인프라를 검증하기 위해 **Polar Sandbox**를 사용한 테스트 결제 시스템을 구축한다.

성공 기준:
1. 신규 사용자는 온보딩 완료(`profiles` row 생성) 시점에 환영 크레딧 5개를 받고, 모든 AI 기능 호출 시 크레딧 1개씩 차감된다.
2. 사용자가 3-tier 패키지 중 하나를 선택해 Polar 호스티드 체크아웃으로 테스트 카드 결제를 완료하면 잔액에 정확히 반영된다.
3. 결제 후 적립은 웹훅(주) + success URL(보조) 양쪽에서 일어나도 idempotent하게 한 번만 처리된다.
4. 잔액 부족 시 사용자는 모달을 통해 충전 페이지로 자연스럽게 유도된다.

## 2. 결정사항 요약

| 결정 영역 | 결정 |
|---|---|
| 결제 모델 | 일회성 크레딧 충전 (구독 아님) |
| 크레딧 범위 | 모든 AI 기능 공통 (1회 호출 = 1 크레딧) |
| 무료 한도 | 가입 보너스 5 크레딧만, 이후 모두 차감 |
| 패키지 | 3-tier (Small/Medium/Large) |
| 실행 환경 | Vercel 배포 중심, 로컬은 success URL fallback |
| 통화 | USD (Polar Sandbox 기본) |

## 3. 아키텍처

```
사용자 ──▶ /billing (3 패키지 + 현재 잔액)
            │ "충전" 클릭
            ▼
   Server Action: startCheckout(sku)
   - customer_external_id = supabase user_id
   - metadata = { credits, sku, user_id }
            │
            ▼
   Polar Sandbox 호스티드 체크아웃 ─────────┐
                                          ▼
                              [4242 테스트 카드 결제]
                                          │
   ┌──────────────────────────────────────┘
   │ (a) 비동기 웹훅 order.paid
   │     POST /api/polar/webhook
   │       → signature 검증
   │       → admin.rpc('apply_credit_delta')
   │       → credit_ledger INSERT (polar_order_id UNIQUE)
   │       → user_credits.balance += N
   │
   │ (b) success 리다이렉트
   │     /billing/success?checkout_id=...
   │       → polar.fetch('/v1/checkouts/{id}')
   │       → 같은 RPC 호출 (idempotent fallback)
   ▼
잔액 갱신 + "충전 완료" 카드
```

핵심 원칙:

- **이중화**: 웹훅(주) + success URL(보조). 둘 다 `polar_order_id`를 키로 같은 RPC 호출 → idempotent.
- **Ledger-first**: `credit_ledger`가 단일 진실의 원천. `user_credits.balance`는 캐시 컬럼이며 balance ≡ SUM(ledger.delta) 불변식을 테스트로 검증한다.
- **권한 부여는 DB-level**: 모든 적립/차감은 `apply_credit_delta` PRPC를 거치고, 일반 server action은 cookie 세션의 user_id만 신뢰한다.

## 4. 데이터 모델

마이그레이션 1개 추가: `supabase/migrations/20260516000001_credits.sql`.

```sql
-- ========== user_credits (잔액 캐시) ==========
create table public.user_credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

create policy "user_credits_owner_select" on public.user_credits
  for select using (auth.uid() = user_id);
-- INSERT/UPDATE는 서버(security definer RPC)만 수행. 클라이언트 write 정책 없음.

create trigger user_credits_set_updated_at
  before update on public.user_credits
  for each row execute function public.update_updated_at_column();

-- ========== credit_ledger (단일 진실의 원천) ==========
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
-- INSERT는 서버 전용.

-- ========== 가입 보너스 트리거 ==========
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

-- ========== 원자적 적립/차감 RPC ==========
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
      return (select balance from public.user_credits where user_id = p_user_id);
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

설계 포인트:

| 결정 | 이유 |
|---|---|
| balance를 캐시 + ledger SUM이 진실 | 감사·환불·디버깅 가능, 테스트로 불변식 검증 |
| `polar_order_id UNIQUE` | 웹훅과 success URL 양쪽에서 호출돼도 중복 적립 차단 |
| `apply_credit_delta` RPC + `security definer` | RLS 우회 경로를 한 곳으로 격리 |
| `reason` check 제약 | 적립/차감 출처 분류, 운영 쿼리·환불 식별에 활용 |
| 신규 가입 보너스 = 5 크레딧 | 5개 기능을 한 번씩 체험할 수 있는 양 |

### 기존 server action 수정 패턴

기존 5개 AI 호출 server action(`generateDailyFortune`, `generateZodiac`, `generateTarot`, `generateDream`, `generateLotto`)에 다음 wrapper를 추가한다.

```ts
// 호출 시작 시
try {
  const remaining = await rpc('apply_credit_delta', {
    p_user_id: user.id, p_delta: -1, p_reason: 'consume_daily',
    p_related_kind: 'daily', p_related_id: kstDate,
  });
} catch (e) {
  if (isInsufficientCredits(e)) return { ok: false, code: 'INSUFFICIENT_CREDITS' };
  throw e;
}
```

같은 날 동일 fortune 재조회는 `fortune_daily` unique 제약으로 캐시 hit이므로 차감 분기를 거치지 않는다. 첫 생성 시점에만 차감.

## 5. Polar 통합

### 5.1 SKU 매핑

| 패키지 | 가격(USD) | 크레딧 | 1크레딧당 단가 | 마케팅 라벨 |
|---|---|---|---|---|
| Small | $1.99 | 10 | $0.199 | 한 주 체험팩 |
| Medium | $7.99 | 50 | $0.160 (20% off) | 한 달 든든팩 (Most popular) |
| Large | $24.99 | 200 | $0.125 (37% off) | 헤비유저팩 |

```ts
// src/lib/billing/packages.ts
export const CREDIT_PACKAGES = {
  small:  { credits: 10,  label: '한 주 체험팩' },
  medium: { credits: 50,  label: '한 달 든든팩' },
  large:  { credits: 200, label: '헤비유저팩' },
} as const;
export type CreditPackageId = keyof typeof CREDIT_PACKAGES;
```

### 5.2 환경 변수

```
POLAR_PRODUCT_SMALL=prod_xxxx
POLAR_PRODUCT_MEDIUM=prod_xxxx
POLAR_PRODUCT_LARGE=prod_xxxx
POLAR_ORG_TOKEN=polar_oat_xxxx
POLAR_WEBHOOK_SECRET=whsec_xxxx
POLAR_ENV=sandbox
NEXT_PUBLIC_SITE_URL=https://...
```

### 5.3 헬퍼 모듈

`src/lib/billing/` 디렉터리에 다음을 둔다.

```ts
// src/lib/billing/polar.ts
// 얇은 fetch wrapper: 베이스 URL + Bearer 인증 헤더만 주입.
// production/sandbox는 POLAR_ENV로 base를 분기 (sandbox-api.polar.sh vs api.polar.sh).
export const polar = {
  fetch: <T = unknown>(path: string, init?: RequestInit & { body?: unknown }) => Promise<T>,
};

// src/lib/billing/credits.ts
// product_id → credits 매핑. 환경변수 3개와 CREDIT_PACKAGES를 cross-check해 단일 진실 보장.
// 매핑되지 않는 product_id가 들어오면 throw — 웹훅 처리 즉시 중단.
export function deriveCreditsFromProduct(productId: string): number;

// src/lib/billing/webhook-signature.ts
// Standard Webhooks HMAC-SHA256 검증 (외부 SDK 없이 직접 구현).
export function verifyPolarSignature(args: {
  id: string; ts: string; body: string; sig: string; secret: string;
}): boolean;

// src/lib/supabase/admin.ts (이미 존재) — service-role client.
// 웹훅·success 라우트에서만 사용.
```

### 5.4 Polar 셋업 절차 (MCP로 1회)

1. `polar_products_create` × 3 — 위 표대로. `metadata: { credits: '10'|'50'|'200', sku: 'small'|'medium'|'large' }` 동봉. **product metadata에 credits 박아두는 게 핵심** — 웹훅에서 product_id만으로 크레딧 수 역산이 가능해 코드 상수와 이중 검증.
2. `polar_webhooks_create_webhook_endpoint` — URL=`{SITE_URL}/api/polar/webhook`, events=`['order.created','order.paid','order.refunded']`. 반환된 secret을 `.env`에 저장.
3. 발급된 product_id 3개를 `.env`에 저장.
4. Sandbox 테스트 카드: `4242 4242 4242 4242` / 미래 만료일 / 임의 CVC.

### 5.5 체크아웃 시작 (server action)

```ts
// src/app/actions/billing.ts
'use server';
export async function startCheckout(sku: CreditPackageId) {
  const user = await requireUser();
  const productId = process.env[`POLAR_PRODUCT_${sku.toUpperCase()}`];
  const credits = CREDIT_PACKAGES[sku].credits;

  const checkout = await polar.fetch('/v1/checkouts', {
    method: 'POST',
    body: {
      products: [productId],
      customer_external_id: user.id,
      customer_email: user.email,
      success_url: `${SITE_URL}/billing/success?checkout_id={CHECKOUT_ID}`,
      metadata: { sku, credits: String(credits), user_id: user.id },
    },
  });
  redirect(checkout.url);
}
```

중요:

- MCP는 일반 운영(상품 생성·웹훅 등록·조회)용. 체크아웃 생성은 사용자 액션마다 일어나므로 **REST API로 직접 호출**한다. MCP는 LLM 컨텍스트 안에서만 호출 가능해 런타임 API로 쓸 수 없다.
- `customer_external_id=user.id`로 두면 Polar가 같은 사용자의 반복 결제를 동일 customer로 자동 묶는다.
- `success_url`의 `{CHECKOUT_ID}`는 Polar가 자동 치환하는 토큰.

### 5.6 웹훅 핸들러

`src/app/api/polar/webhook/route.ts`.

```ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('webhook-signature') ?? '';
  const ts  = req.headers.get('webhook-timestamp') ?? '';
  const id  = req.headers.get('webhook-id') ?? '';

  if (!verifyPolarSignature({ id, ts, body, sig, secret: WEBHOOK_SECRET })) {
    return new Response('invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);
  if (event.type !== 'order.paid') return new Response('ignored', { status: 200 });

  const order = event.data;
  const userId  = order.customer.external_id;
  const credits = deriveCreditsFromProduct(order.product_id); // metadata 신뢰 X, 환경변수로 cross-check

  await admin.rpc('apply_credit_delta', {
    p_user_id: userId, p_delta: credits,
    p_reason: 'purchase', p_polar_order_id: order.id,
  });

  return new Response('ok', { status: 200 });
}
```

- `src/proxy.ts`에서 `/api/polar/webhook`은 인증 bypass 추가 (`/portfolio`와 같은 패턴).
- Raw body 필수 — `req.text()` 사용.
- 서명 검증은 [Standard Webhooks](https://www.standardwebhooks.com/) 스펙. HMAC-SHA256 직접 구현(약 15줄).

### 5.7 Success 라우트

`src/app/billing/success/page.tsx` — 서버 컴포넌트.

```ts
export default async function SuccessPage({ searchParams }) {
  const { checkout_id } = await searchParams;
  const checkout = await polar.fetch(`/v1/checkouts/${checkout_id}`);
  if (checkout.status === 'succeeded' && checkout.order) {
    await admin.rpc('apply_credit_delta', {
      p_user_id: checkout.customer_external_id,
      p_delta: deriveCreditsFromProduct(checkout.order.product_id),
      p_reason: 'purchase',
      p_polar_order_id: checkout.order.id,
    });
  }
  return <SuccessCard ... />;
}
```

웹훅이 1–10초 지연되더라도 success 페이지에서 즉시 잔액 반영. 양쪽 모두 같은 `polar_order_id`로 충돌해 한쪽이 no-op 처리된다.

## 6. UI/UX

DESIGN.md의 commerce-flow 토큰셋 적용 — buy-now CTA는 cobalt `{colors.primary}`, pill buttons, `{rounded.xxxl}` 카드.

### 6.1 컴포넌트 트리

```
/billing
  ├ <BillingHeader/>              현재 잔액 + 가입 보너스 안내
  ├ <CreditPackageCard sku=...>×3 메인 그리드
  └ <BillingFooter/>              Sandbox 안내, FAQ 한 줄

/billing/success?checkout_id=
  └ <PurchaseSuccessCard/>        +N 크레딧, 잔액, "운세 보러 가기"

전역
  └ <CreditBadge/>                app-header.tsx에 잔액 칩 추가

AI 호출 페이지 (5개)
  └ <InsufficientCreditsDialog/>  잔액 0일 때 모달
```

### 6.2 `/billing` 데스크탑 와이어프레임

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 뒤로            momentum                       🟢 12 크레딧   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   크레딧 충전                                                    │  display-lg
│   AI 운세 호출 1회당 크레딧 1개가 사용돼요                       │  subtitle-md
│                                                                  │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │   ✦ Small   │  │  ★ Most popular │  │  ✦✦✦ Large       │     │
│  │             │  │  ✦✦ Medium      │  │                  │     │
│  │  10 크레딧   │  │  50 크레딧      │  │  200 크레딧      │     │
│  │   $1.99     │  │   $7.99 -20%off │  │   $24.99 -37%off │     │
│  │ [   충전   ]│  │ [    충전    ]  │  │ [    충전     ] │     │  button-buy-cta
│  └─────────────┘  └─────────────────┘  └──────────────────┘     │
│                                                                  │
│  Sandbox 테스트: 4242 4242 4242 4242 · 어떤 미래 만료일·CVC도 OK │  caption / steel
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 CreditPackageCard 스타일

| 속성 | 값 |
|---|---|
| 기본 chrome | `card-checkout-summary` (canvas / `{rounded.xl}` / hairline-soft 1px / shadow `rgba(20,22,26,0.3) 0 1px 4px`) |
| Medium 강조 | `2px solid {colors.primary}` 보더 + 상단 `badge-attention` "Most popular" |
| 크레딧 수치 | `{typography.hero-display}` 64px/500 |
| 가격 | `{typography.heading-lg}` 36px/500 |
| 할인 라벨 | `badge-promo-yellow` (`{colors.warning}` + `{typography.caption-bold}`) |
| CTA | `button-buy-cta` (cobalt pill, "충전") |
| 패키지 라벨 | `{typography.subtitle-lg}` |

### 6.4 `/billing/success` 와이어프레임

```
┌──────────────────────────────────────────────────────────┐
│                      ✓ (success green, 64px)             │
│              충전이 완료됐어요                            │  display-lg
│              +50 크레딧 적립                             │  heading-md 300
│              현재 잔액: 62 크레딧                         │
│        [   운세 보러 가기   ]   [  영수증 보기  ]        │  button-primary + button-secondary
└──────────────────────────────────────────────────────────┘
```

결제는 이미 끝난 상태라 primary CTA는 marketing 패턴 — black `button-primary`.

### 6.5 `<CreditBadge/>`

- 잔액 ≥ 1 → `badge-success` "🟢 N 크레딧"
- 잔액 = 0 → `badge-attention` + 인라인 "충전" 링크
- 클릭 시 `/billing`으로 이동
- 잔액은 `layout.tsx` 서버 컴포넌트에서 fetch (RLS로 본인 row만)

### 6.6 `<InsufficientCreditsDialog/>`

Radix UI Dialog 사용. 5개 AI 호출 페이지 클라이언트 컴포넌트가 `INSUFFICIENT_CREDITS` 결과를 받으면 모달 노출.

```
┌────────────────────────────────────┐
│        크레딧이 부족해요           │  subtitle-lg
│   이 운세를 보려면 크레딧 1개가     │
│   필요해요. 지금 충전하면 바로      │  body-md / charcoal
│   이어서 볼 수 있어요.             │
│   [ 충전하러 가기 ]  [ 닫기 ]      │  button-buy-cta + button-ghost
└────────────────────────────────────┘
```

- 모달은 buy-now 진입점이므로 primary CTA는 cobalt(`button-buy-cta`).

### 6.7 모바일 (< 768px)

- `/billing` 3-up 그리드 → 1-up 세로 스택, 카드 풀폭, `{spacing.base}` 간격
- `<CreditBadge/>` → 잔액 숫자만 (라벨 생략) 헤더 우측 유지
- 모달은 풀스크린 시트로 (Radix Dialog content height 조정)

### 6.8 라우트 보호

- `/billing`, `/billing/success` → `src/proxy.ts` 기본 인증 적용 (추가 작업 없음)
- `/api/polar/webhook` → 인증 bypass (`/portfolio` 패턴 복제)

## 7. 에러 처리 매트릭스

| 시나리오 | 어디서 잡힘 | 동작 | 사용자 노출 |
|---|---|---|---|
| AI 호출 시 잔액=0 | RPC throw 23514 → server action | `{ ok:false, code:'INSUFFICIENT_CREDITS' }` 반환 | `<InsufficientCreditsDialog/>` 모달 |
| 체크아웃 생성 실패 | `startCheckout` server action | 토스트 + `billing_log` 기록 | "잠시 후 다시 시도해 주세요" |
| 웹훅 서명 불일치 | `/api/polar/webhook` | 401 응답, 로그만 | (사용자 노출 없음) |
| 웹훅 도착 전 success 도달 | success 서버 컴포넌트 | Polar API 조회 → RPC 즉시 호출 | "+N 크레딧" 정상 표시 |
| 웹훅 + success 동시 적립 | `polar_order_id UNIQUE` + RPC idempotency | 두 번째 호출 no-op | (사용자 인지 못 함) |
| 결제 취소/실패 | order.paid 안 옴 | 적립 없음 | `/billing`에서 재시도 |
| `order.refunded` 웹훅 | 핸들러가 delta=-credits | balance ≥ 0 가드로 클램프, ledger만 음수 기록 | 운영 대시보드에서만 확인 (Phase 1) |
| user_id가 external_id에 없음 | 웹훅 핸들러 | 200 반환 + 에러 로그 (재시도 방지) | 관리자 알림 (Phase 1은 로그만) |
| 같은 날 같은 fortune 재조회 | server action 캐시 hit 분기 | 차감 skip, 캐시 content 반환 | (정상 동작) |

환불 처리 결정: balance 음수 불가 (check 제약). 환불 시 잔액 부족하면 ledger에 음수 row만 남고 balance는 0에 멈춤. 운영팀이 ledger SUM과 balance 불일치를 발견하면 `admin_adjust`로 수동 정정.

## 8. 테스트 전략

### 단위 테스트 (vitest)

| 파일 | 검증 항목 |
|---|---|
| `src/lib/billing/__tests__/packages.test.ts` | SKU 상수 무결성, credits 양수, label 존재 |
| `src/lib/billing/__tests__/webhook-signature.test.ts` | Standard Webhooks HMAC — 유효 서명 통과, 변조 body 거부, timestamp skew 거부, 누락 헤더 거부 |
| `src/lib/billing/__tests__/credit-math.test.ts` | balance = ledger SUM 불변식 (in-memory 시뮬레이션) |

### 통합 테스트 (Supabase 로컬 또는 sandbox 인스턴스)

| 파일 | 검증 항목 |
|---|---|
| `src/lib/billing/__tests__/rpc-apply-credit.test.ts` | `apply_credit_delta` — 적립/차감/idempotency(같은 polar_order_id 두 번)/잔액 음수 throw |
| `src/lib/billing/__tests__/signup-trigger.test.ts` | profiles INSERT → user_credits row + ledger 5 크레딧 |
| `src/lib/billing/__tests__/webhook-route.test.ts` | POST /api/polar/webhook — 유효/위조/중복 3케이스 |

### 수동 e2e 체크리스트

1. 새 계정 가입 → 헤더 "5 크레딧"
2. 일일운세 1회 → "4 크레딧"
3. 잔액 0까지 소진 → 다음 호출 시 모달
4. 모달에서 충전 → `/billing` → Medium → Polar 페이지 (4242)
5. 결제 완료 → success 페이지 + 잔액 갱신
6. Polar dashboard에서 같은 order 웹훅 redeliver → 잔액 변화 없음
7. 모바일 viewport(375px)에서 1-up 스택 + 풀스크린 시트

## 9. 보안

- **서비스 키 격리**: `SUPABASE_SERVICE_ROLE_KEY`는 웹훅 라우트에서만 사용. 일반 server action은 cookie 세션의 user_id만 사용.
- **웹훅 서명 검증 우선**: 실패 시 즉시 401, body 파싱 안 함.
- **`customer.external_id` 신뢰**: Polar protected field. 방어적으로 RPC 내부 FK 제약으로 user 존재 확인.
- **금액·크레딧 신뢰 경계**: `order.metadata.credits` 그대로 쓰지 않고, `order.product_id`로 `POLAR_PRODUCT_*` 환경변수와 cross-check해서 일치할 때만 적립. `deriveCreditsFromProduct(product_id)`가 단일 진실.
- **Rate limit**: `startCheckout` action은 분당 5회 초과 reject (Phase 1 단순 in-memory 토큰 버킷).
- **proxy 미들웨어**: `/api/polar/webhook` bypass 시 인증 우회만, CORS 열지 않음.
- **CSP**: Polar는 호스티드 페이지로 리다이렉트만 하므로 iframe 위험 없음.

## 10. 로깅·관측

- **`billing_log` 테이블 (Phase 1 범위에 포함)** — 기존 `ai_call_log` 스키마(event/user_id/payload jsonb/error/created_at)를 그대로 복제한 새 테이블. RLS는 admin select만. 다음 시점에 각각 1 row 기록:
  - `checkout_started` (server action 진입)
  - `webhook_received` (서명 검증 성공 직후)
  - `webhook_signature_invalid` (401 응답 직후)
  - `credit_applied` (RPC 성공)
  - `error` (어느 단계든 throw 시)
- Polar dashboard의 Webhook deliveries 페이지가 1차 디버깅 도구 (재전송 가능).
- `polar_metrics_get` MCP는 운영 시 매출 확인용.

## 11. 범위 외 (Phase 2 이후)

- 구독(recurring) 결제
- KRW 통화 (Polar가 KRW 미지원 가능성 — Sandbox로 먼저 USD 검증)
- 사용자 자체 환불 요청 UI
- 운영 대시보드 (admin이 ledger 직접 조회·정정)
- 다른 사용자에게 크레딧 선물
- Polar Customer Portal 통합
- Persistent rate limiter (Vercel Runtime Cache로 in-memory 교체)
