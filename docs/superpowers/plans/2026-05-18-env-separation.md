# 운영/개발 환경 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** master(운영) / develop(영속 스테이징) 두 브랜치 운용, Vercel Custom Env + 별도 Supabase 프로젝트로 환경 완전 분리, GitHub branch protection + CI로 머지 게이트 강제

**Architecture:** 단일 Vercel 프로젝트의 Custom Environment `development`에 별도 Supabase 프로젝트를 매핑한다. master 머지는 develop 검증 통과 + PR + CI 강제. 마이그레이션은 forward-only로 dev에 먼저 적용. OpenRouter는 키 공유 + dev에서 mock 우선 정책.

**Tech Stack:** Next.js 16 (App Router) · Supabase (별도 2 프로젝트) · Vercel Custom Environments · GitHub Actions · gh CLI · Supabase MCP

**참조 spec:** `docs/superpowers/specs/2026-05-18-env-separation-design.md`

---

## File Structure

### Repo 신규 파일
- `.github/workflows/ci.yml` — PR CI (test + build + typecheck + lint)
- `.github/workflows/smoke.yml` — 운영 배포 후 smoke check
- `.github/pull_request_template.md` — PR 체크리스트
- `supabase/seed/dev.sql` — dev Supabase 시드 데이터
- `src/lib/openrouter/__tests__/mock-flag.test.ts` — USE_OPENROUTER_MOCK 분기 테스트

### Repo 수정 파일
- `src/lib/openrouter/client.ts` — `USE_OPENROUTER_MOCK` 분기 추가
- `.env.example` — 새 변수 추가, dev/prod 가이드 보강
- `CLAUDE.md` — develop/master 워크플로우 섹션 추가

### 외부 콘솔 작업 (사용자 액션 필요, 코드 변경 없음)
- Supabase Dashboard: 신규 dev 프로젝트
- Google Cloud Console: OAuth redirect URI 추가
- Kakao Developers: OAuth redirect URI 추가
- Polar Sandbox: dev product 3개 + webhook
- Vercel Dashboard: Custom Environment + 환경변수
- GitHub Repo Settings: branch protection

---

## Phase A — Repo 변경 (Claude 직접)

### Task 1: `USE_OPENROUTER_MOCK` 환경변수 분기

**Why:** dev 환경에서 OpenRouter 실제 호출 없이 결정론적 mock 응답으로 비용 0 + 빠른 반복 검증.

**Files:**
- Create: `src/lib/openrouter/__tests__/mock-flag.test.ts`
- Modify: `src/lib/openrouter/client.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/openrouter/__tests__/mock-flag.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callFortuneModel } from '@/lib/openrouter/client'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  process.env.OPENROUTER_API_KEY = 'test-key'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

describe('callFortuneModel — USE_OPENROUTER_MOCK', () => {
  it('returns deterministic mock response when USE_OPENROUTER_MOCK=true and skips fetch', async () => {
    process.env.USE_OPENROUTER_MOCK = 'true'
    const fetchImpl = vi.fn()

    const out = await callFortuneModel<{ headline: string }>({
      systemPrompt: 's',
      userPrompt: 'general daily fortune',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.headline).toBeDefined()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('calls real fetch when USE_OPENROUTER_MOCK is unset', async () => {
    delete process.env.USE_OPENROUTER_MOCK
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"ok":1}' } }] }),
    } as Response)

    const out = await callFortuneModel<{ ok: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.ok).toBe(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('calls real fetch when USE_OPENROUTER_MOCK=false', async () => {
    process.env.USE_OPENROUTER_MOCK = 'false'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"x":1}' } }] }),
    } as Response)

    const out = await callFortuneModel<{ x: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.x).toBe(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

```bash
npm test -- mock-flag
```
Expected: 첫 번째 테스트 FAIL — fetchImpl이 호출되어 "should not have been called" 에러.

- [ ] **Step 3: client.ts에 분기 추가**

`src/lib/openrouter/client.ts` 함수 본문 최상단에 추가 (apiKey 체크 직전):

기존:
```ts
export async function callFortuneModel<T>(opts: CallOptions): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500)
```

변경:
```ts
export async function callFortuneModel<T>(opts: CallOptions): Promise<T> {
  if (process.env.USE_OPENROUTER_MOCK === 'true') {
    const mock = await import('./__mocks__/client')
    return mock.callFortuneModel<T>({ userPrompt: opts.userPrompt })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- mock-flag
```
Expected: 3개 테스트 모두 PASS.

- [ ] **Step 5: 전체 테스트 회귀 확인**

```bash
npm test
```
Expected: 기존 27개 + 신규 3개 = 30개 PASS.

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```
Expected: 0 error.

- [ ] **Step 7: Commit (사용자 승인 필수 — CLAUDE.md 규칙)**

```
변경 파일:
- src/lib/openrouter/client.ts (분기 추가)
- src/lib/openrouter/__tests__/mock-flag.test.ts (신규)
```

승인 후:
```bash
git add src/lib/openrouter/client.ts src/lib/openrouter/__tests__/mock-flag.test.ts
git commit -m "feat(openrouter): add USE_OPENROUTER_MOCK flag for dev environment"
```

---

### Task 2: `.env.example` 업데이트

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: 변경**

기존 16번째 줄(ADMIN_EMAILS) 다음에 추가:

```
# Dev/Test 전용: true 면 OpenRouter 실제 호출 없이 결정론적 mock 응답.
# Production 환경에는 절대 설정하지 말 것. Development 환경 기본값 = true.
USE_OPENROUTER_MOCK=
```

- [ ] **Step 2: 커밋 (승인 후)**

```bash
git add .env.example
git commit -m "docs(env): document USE_OPENROUTER_MOCK dev flag in .env.example"
```

---

### Task 3: PR 템플릿 추가

**Files:**
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: 파일 작성**

`.github/pull_request_template.md`:

```markdown
## 변경 요약
<!-- 무엇을 / 왜 -->

## 영향 범위
- [ ] DB 마이그레이션 포함 → `supabase/migrations/` 추가 파일 명시
- [ ] 환경변수 추가/변경 → 변수명과 환경(Production/Development) 명시
- [ ] 외부 서비스 설정 변경 (Polar/OAuth/Supabase Auth 등)
- [ ] 운영 사용자 데이터에 영향 (마이그레이션 destructive)

## 검증
- [ ] develop 환경에서 핵심 플로우 확인
- [ ] (마이그레이션 있으면) dev Supabase에 apply 완료 + SELECT 확인
- [ ] CI 통과 확인
- [ ] DESIGN.md 토큰/컴포넌트 준수
- [ ] CLAUDE.md 커밋·푸시 규칙 준수
```

- [ ] **Step 2: 커밋 (승인 후)**

```bash
git add .github/pull_request_template.md
git commit -m "chore(github): add PR template with verification checklist"
```

---

### Task 4: CI 워크플로우 추가

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 파일 작성**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [master, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
          SUPABASE_SERVICE_ROLE_KEY: placeholder
          NEXT_PUBLIC_SITE_URL: https://placeholder.vercel.app
          OPENROUTER_API_KEY: placeholder
          USE_OPENROUTER_MOCK: 'true'
          POLAR_ENV: sandbox
          POLAR_ORG_TOKEN: placeholder
          POLAR_WEBHOOK_SECRET: whsec_placeholder
          POLAR_PRODUCT_SMALL: placeholder
          POLAR_PRODUCT_MEDIUM: placeholder
          POLAR_PRODUCT_LARGE: placeholder
          ADMIN_EMAILS: placeholder@example.com
```

- [ ] **Step 2: 로컬에서 동일 명령 실행해 통과 확인**

```bash
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
```
Expected: 모두 0 exit code.

- [ ] **Step 3: 커밋 (승인 후)**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR verification workflow (typecheck/lint/test/build)"
```

---

### Task 5: Smoke check 워크플로우 추가

**Files:**
- Create: `.github/workflows/smoke.yml`

- [ ] **Step 1: 파일 작성**

`.github/workflows/smoke.yml`:

```yaml
name: Production Smoke

on:
  workflow_dispatch:
  push:
    branches: [master]

concurrency:
  group: smoke-prod
  cancel-in-progress: false

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Wait for Vercel deploy
        run: sleep 90

      - name: 4 landings return 200
        run: |
          for p in /fortune /tarot /dream /lotto; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            if [ "$code" != "200" ]; then
              echo "FAIL: $p returned $code (expected 200)"
              exit 1
            fi
            echo "OK: $p $code"
          done

      - name: SEO assets return 200
        run: |
          for p in /robots.txt /sitemap.xml /llms.txt /opengraph-image; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            if [ "$code" != "200" ]; then
              echo "FAIL: $p returned $code (expected 200)"
              exit 1
            fi
            echo "OK: $p $code"
          done

      - name: Protected child routes redirect (307)
        run: |
          for p in /tarot/result /dream/journal /billing /history /me /settings; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            if [ "$code" != "307" ]; then
              echo "FAIL: $p returned $code (expected 307)"
              exit 1
            fi
            echo "OK: $p $code"
          done
```

- [ ] **Step 2: 커밋 (승인 후)**

```bash
git add .github/workflows/smoke.yml
git commit -m "ci: add production smoke check on master push"
```

---

### Task 6: dev seed SQL 추가

**Files:**
- Create: `supabase/seed/dev.sql`

- [ ] **Step 1: 파일 작성**

`supabase/seed/dev.sql`:

```sql
-- Development Supabase seed
-- Apply via Supabase MCP `apply_migration` (one-time after dev project setup)
-- 운영 사용자 데이터는 절대 복제하지 않음. PII 격리 원칙.
--
-- 사전 조건:
--   1. dev Supabase에 OAuth로 1회 로그인하여 auth.users 행을 생성
--   2. 그 uuid를 아래 `<dev-test-user-uuid>` 자리에 채워 넣을 것

-- Step 1: profile fill (auth.users 가 먼저 존재해야 함)
insert into profiles (id, full_name, birth_date, gender)
values
  ('<dev-test-user-uuid>', '테스트유저', '1990-01-01', 'unspecified')
on conflict (id) do update
  set full_name = excluded.full_name,
      birth_date = excluded.birth_date,
      gender = excluded.gender;

-- Step 2: 테스트 크레딧 50 부여 (signup bonus와 별개)
insert into credits_ledger (user_id, delta, reason)
values
  ('<dev-test-user-uuid>', 50, 'dev-seed-extra');

-- Step 3: 검증 — 잔액 확인
-- select user_id, sum(delta) as balance
-- from credits_ledger
-- where user_id = '<dev-test-user-uuid>'
-- group by user_id;
```

- [ ] **Step 2: 커밋 (승인 후)**

```bash
git add supabase/seed/dev.sql
git commit -m "feat(supabase): add dev environment seed sql"
```

---

### Task 7: CLAUDE.md 워크플로우 섹션 업데이트

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 변경**

기존 `## Git 커밋 & Push 규칙` 섹션 위에 신규 섹션 추가:

```markdown
## 브랜치 & 환경 워크플로우

### 브랜치 구조
- `master` — 운영 (Production). branch protection 활성. 직접 push 금지.
- `develop` — 영속 스테이징. Vercel Custom Env `development`에 자동 배포.
- `feature/<topic>` / `fix/<topic>` — 작업용 임시 브랜치. develop에 PR.

### Golden Path
1. `develop`에서 feature 브랜치 컷
2. 작업 후 develop으로 PR → CI 통과 시 머지 → dev 환경 자동 배포
3. development 환경에서 통합 테스트 (4개 랜딩 + 결제 sandbox + RLS)
4. (마이그레이션 있으면) Supabase MCP로 dev에 apply
5. develop → master PR → CI 통과 시 머지 → 운영 자동 배포
6. (마이그레이션 있으면) master 머지 직후 운영 Supabase에 apply

### 핫픽스 예외
운영 다운 등 명확한 사유에만 master에서 직접 fix 브랜치 컷 → master PR. 머지 후 develop으로 백포트 PR.

### 마이그레이션 원칙
- forward-only. down 마이그레이션 작성 금지.
- 항상 dev에 먼저 apply → 검증 → master 머지 후 prod apply.
- Destructive change(컬럼/테이블 DROP, NOT NULL 추가)는 3-phase로 분리.
```

- [ ] **Step 2: 커밋 (승인 후)**

```bash
git add CLAUDE.md
git commit -m "docs(workflow): document develop/master branch workflow"
```

---

## Phase A 통합 검증

- [ ] **Step 1: 모든 Phase A 커밋 확인**

```bash
git log --oneline -10
```

7개 커밋이 순서대로 있어야 함 (Task 1~7).

- [ ] **Step 2: 빌드 + 테스트 마지막 확인**

```bash
npm run build && npm test
```

- [ ] **Step 3: Phase A 일괄 push 승인 요청 + push**

```bash
git push origin master
```

(주의: Phase A는 develop 브랜치 도입 전이므로 master에 직접 push. Task 16 이후부터는 develop으로 PR.)

---

## Phase B — 외부 인프라 셋업 (사용자 콘솔 작업)

> 이 섹션의 각 step은 사용자가 직접 브라우저/콘솔에서 수행. Claude는 검증과 MCP 호출만 담당.

### Task 8: Supabase 신규 dev 프로젝트 생성

- [ ] **Step 1: Supabase Dashboard에서 신규 프로젝트**

1. https://supabase.com/dashboard 접속
2. "New Project" 클릭
3. 이름: `momentum-dev` (또는 사용자 선호)
4. Region: `Northeast Asia (Seoul)` 또는 기존 운영과 동일 region 권장
5. Database password 생성 후 1Password 등에 안전 저장
6. "Create new project" → 약 2분 대기

- [ ] **Step 2: 키 발급 정보 확인**

Project Settings → API:
- `Project URL`: `https://<dev-ref>.supabase.co`
- `anon public` key
- `service_role secret` key

이 3개 값을 사용자가 다음 task에 사용하도록 안전한 노트에 임시 보관.

- [ ] **Step 3: Supabase MCP에 dev 프로젝트 연결 확인**

Claude가 실행:
```
mcp__supabase__list_tables(project_id: '<dev-ref>')
```
Expected: 빈 array 또는 auth/storage 시스템 테이블만.

---

### Task 9: dev Supabase에 마이그레이션 8개 일괄 적용

**참조 파일** (이미 운영에 적용된 것 그대로):
- `supabase/migrations/20260503000001_init_phase1.sql`
- `supabase/migrations/20260504000001_dream_ai_usage.sql`
- `supabase/migrations/20260504000002_dream_journal.sql`
- `supabase/migrations/20260504000003_ai_call_log.sql`
- `supabase/migrations/20260516000001_credits.sql`
- `supabase/migrations/20260516000002_billing_log.sql`
- `supabase/migrations/20260516000003_billing_log_insert_policy.sql`
- `supabase/migrations/20260516000005_credits_rpc_fix.sql`

- [ ] **Step 1: Claude가 각 SQL 파일 내용을 읽고 순서대로 MCP apply**

```
for f in migrations 파일 (timestamp 순):
  content = Read(f)
  mcp__supabase__apply_migration(
    project_id='<dev-ref>',
    name='<파일명에서 timestamp 제거>',
    query=content
  )
```

- [ ] **Step 2: 적용 결과 확인**

```
mcp__supabase__list_migrations(project_id='<dev-ref>')
mcp__supabase__list_tables(project_id='<dev-ref>')
```
Expected: 운영과 동일하게 profiles, fortune_daily, dream_logs, dream_journal, ai_call_log, credits_ledger, billing_log 등 테이블 존재.

- [ ] **Step 3: 사용자에게 결과 보고 후 다음 task 진행 승인 요청**

---

### Task 10: dev Supabase Auth Providers 활성화 + Site URL 설정

- [ ] **Step 1: Auth → Providers 활성화**

dev Supabase Dashboard → Authentication → Providers:
1. **Google**: Enable, Client ID + Secret 입력 (기존 운영용 동일 값 사용)
2. **Kakao**: Enable, Client ID + Secret 입력 (동일)

- [ ] **Step 2: Site URL + Redirect URLs**

Authentication → URL Configuration:
- Site URL: `https://development-momentum-with-claude.vercel.app`
- Redirect URLs (추가):
  - `https://development-momentum-with-claude.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (로컬 개발용)

---

### Task 11: Google/Kakao OAuth redirect URI 추가

- [ ] **Step 1: Google Cloud Console**

1. https://console.cloud.google.com → APIs & Services → Credentials
2. 기존 OAuth 2.0 Client ID 클릭
3. "Authorized redirect URIs" 섹션에 추가:
   - `https://<dev-ref>.supabase.co/auth/v1/callback`
4. Save

- [ ] **Step 2: Kakao Developers**

1. https://developers.kakao.com → 내 애플리케이션 → 기존 앱
2. 카카오 로그인 → Redirect URI 등록:
   - `https://<dev-ref>.supabase.co/auth/v1/callback`
3. Save

---

### Task 12: Polar Sandbox dev 셋업

- [ ] **Step 1: dev product 3개 생성**

https://sandbox.polar.sh → Products → Create Product:

| 이름 | 가격 (KRW) | 환경변수에 들어갈 product ID |
|---|---|---|
| Small Credits Pack (dev) | 2,500 KRW | `POLAR_PRODUCT_SMALL` (dev) |
| Medium Credits Pack (dev) | 9,900 KRW | `POLAR_PRODUCT_MEDIUM` (dev) |
| Large Credits Pack (dev) | 29,900 KRW | `POLAR_PRODUCT_LARGE` (dev) |

각 생성 후 `prod_xxx` ID 복사.

- [ ] **Step 2: Webhook 등록**

sandbox.polar.sh → Webhooks → Add endpoint:
- URL: `https://development-momentum-with-claude.vercel.app/api/polar/webhook`
- Events: `order.paid` (최소 필수)
- Secret 발급 → 복사 (Vercel env에 사용)

- [ ] **Step 3: Organization Access Token 발급 (sandbox용 별도)**

Profile → Settings → Developer → New Token:
- Name: `momentum-dev`
- Scopes: 운영 토큰과 동일
- Token 복사 (한 번만 보임)

---

### Task 13: Vercel Custom Environment + 도메인

- [ ] **Step 1: Custom Environment 생성**

Vercel Dashboard → Project `momentum-with-claude` → Settings → Environments:
1. "Create Environment" 클릭
2. Name: `development`
3. Type: Custom (Production-like)
4. Git Branch 매핑: `develop`
5. Save

- [ ] **Step 2: 도메인 alias 셋업**

Vercel → Settings → Domains:
1. "Add Domain" 클릭
2. 도메인: `development-momentum-with-claude.vercel.app`
3. 환경 매핑: `development`
4. Apply

---

### Task 14: Vercel 환경변수 셋업

Vercel → Settings → Environment Variables. 각 변수마다 scope 체크박스로 환경 분기.

- [ ] **Step 1: Development 환경 전용 변수**

추가 또는 기존 변수 환경 매핑 수정:
- `NEXT_PUBLIC_SUPABASE_URL` = dev Supabase URL (scope: Development만)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = dev anon key (Development만)
- `SUPABASE_SERVICE_ROLE_KEY` = dev service role (Development만)
- `NEXT_PUBLIC_SITE_URL` = `https://development-momentum-with-claude.vercel.app` (Development만)
- `POLAR_ENV` = `sandbox` (Development만)
- `POLAR_ORG_TOKEN` = dev sandbox 토큰 (Development만)
- `POLAR_WEBHOOK_SECRET` = dev webhook secret (Development만)
- `POLAR_PRODUCT_SMALL/MEDIUM/LARGE` = dev product IDs (Development만)
- `USE_OPENROUTER_MOCK` = `true` (Development만) ← 신규
- `ADMIN_EMAILS` = `heyday1019@gmail.com` (Development만)

- [ ] **Step 2: Production 환경 변수는 기존 그대로**

확인만:
- 모든 prod 변수가 `Production` scope에 체크되어 있는지
- `USE_OPENROUTER_MOCK`이 Production에는 **체크 안 됨** 확인

- [ ] **Step 3: 공통 변수**

- `OPENROUTER_API_KEY` = 공유 키 (Production + Development 둘 다 체크)

- [ ] **Step 4: Preview 환경**

Preview는 Development와 동일 값 매핑. Vercel Variables에서 Preview scope에 dev 변수와 같은 값 추가하거나, Variable Group으로 묶어서 관리.

---

### Task 15: dev Supabase에 seed.sql apply

- [ ] **Step 1: dev 환경에 1회 OAuth 로그인**

브라우저: `https://development-momentum-with-claude.vercel.app/login`
- Google 또는 Kakao로 본인 계정 로그인
- onboarding 페이지에서 profile 정보 입력 후 저장

(이 시점에 dev Supabase의 auth.users + profiles에 행이 생긴다)

- [ ] **Step 2: dev Supabase에서 본인 user_id 조회**

Claude 실행:
```
mcp__supabase__execute_sql(
  project_id='<dev-ref>',
  query='select id, email from auth.users limit 5;'
)
```

본인 이메일에 해당하는 uuid 확인.

- [ ] **Step 3: `supabase/seed/dev.sql`의 `<dev-test-user-uuid>`를 실제 uuid로 치환한 SQL 실행**

Claude 실행:
```
mcp__supabase__execute_sql(
  project_id='<dev-ref>',
  query='<seed.sql 내용 + 실제 uuid 치환>'
)
```

- [ ] **Step 4: 잔액 확인**

```
mcp__supabase__execute_sql(
  project_id='<dev-ref>',
  query='select user_id, sum(delta) as balance from credits_ledger group by user_id;'
)
```
Expected: 본인 user_id에 signup bonus + 50 dev-seed-extra 합산 잔액.

---

## Phase C — 브랜치 + 보호 활성화

### Task 16: develop 브랜치 생성 + push

- [ ] **Step 1: 현재 master 최신화 확인**

```bash
git checkout master
git pull origin master
git status
```
Expected: clean working tree (untitled.pen 외).

- [ ] **Step 2: develop 브랜치 컷**

```bash
git checkout -b develop
```

- [ ] **Step 3: origin push**

```bash
git push -u origin develop
```

- [ ] **Step 4: Vercel develop 매핑 확인**

10초 대기 후:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://development-momentum-with-claude.vercel.app/fortune
```
Expected: 200.

만약 404/503이면 Vercel 빌드 진행 중 — Vercel 대시보드에서 deployment 상태 확인.

- [ ] **Step 5: master로 복귀**

```bash
git checkout master
```

---

### Task 17: GitHub branch protection 활성화

`gh` CLI로 자동화 가능.

- [ ] **Step 1: master 브랜치 보호 규칙**

```bash
gh api -X PUT repos/heyday1019/momentum_with_claude/branches/master/protection \
  -F required_status_checks.strict=true \
  -F required_status_checks.contexts[]=verify \
  -F enforce_admins=false \
  -F required_pull_request_reviews.required_approving_review_count=0 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

Expected: JSON 응답 (보호 규칙 생성).

- [ ] **Step 2: develop 브랜치 보호 규칙 (동일)**

```bash
gh api -X PUT repos/heyday1019/momentum_with_claude/branches/develop/protection \
  -F required_status_checks.strict=true \
  -F required_status_checks.contexts[]=verify \
  -F enforce_admins=false \
  -F required_pull_request_reviews.required_approving_review_count=0 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

- [ ] **Step 3: 확인**

```bash
gh api repos/heyday1019/momentum_with_claude/branches/master/protection | head -30
gh api repos/heyday1019/momentum_with_claude/branches/develop/protection | head -30
```
Expected: 두 브랜치 모두 동일 규칙 활성화.

---

## Phase D — 검증

### Task 18: 더미 PR로 CI 동작 확인

- [ ] **Step 1: 빈 변경 브랜치 컷**

```bash
git checkout develop
git pull origin develop
git checkout -b chore/ci-verify
echo "# CI verify" >> docs/_ci_verify.md
git add docs/_ci_verify.md
git commit -m "chore(ci): trigger CI workflow for the first time"
git push -u origin chore/ci-verify
```

- [ ] **Step 2: PR 생성**

```bash
gh pr create --base develop --head chore/ci-verify \
  --title "chore: verify CI workflow" \
  --body "Triggering CI for the first time after branch protection setup."
```

Expected: PR URL 출력.

- [ ] **Step 3: CI 결과 확인**

```bash
gh pr checks --watch
```

Expected: `verify` job PASS (수 분 소요).

- [ ] **Step 4: PR 닫기 + 브랜치 삭제**

검증 목적이라 머지하지 않고 닫음:

```bash
gh pr close chore/ci-verify --delete-branch
```

---

### Task 19: dev 환경 4개 랜딩 + 핵심 플로우 확인

- [ ] **Step 1: 4개 랜딩 200 확인**

```bash
BASE=https://development-momentum-with-claude.vercel.app
for p in /fortune /tarot /dream /lotto; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${p}")
  echo "$p: $code"
done
```
Expected: 모두 200.

- [ ] **Step 2: SEO 자산 200 확인**

```bash
for p in /robots.txt /sitemap.xml /llms.txt /opengraph-image; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${p}")
  echo "$p: $code"
done
```
Expected: 모두 200.

`/robots.txt`, `/sitemap.xml`, `/llms.txt`의 `Host`/도메인이 dev 도메인을 가리키는지도 확인:
```bash
curl -s "${BASE}/robots.txt" | grep -i host
curl -s "${BASE}/sitemap.xml" | grep -oE 'https://[^<]+' | head -3
```
Expected: `development-momentum-with-claude.vercel.app` 표시.

- [ ] **Step 3: 브라우저 수동 검증**

`https://development-momentum-with-claude.vercel.app` 접속:
- [ ] 로그인 → OAuth 동작 (Google/Kakao)
- [ ] 온보딩 → 프로필 저장
- [ ] 홈에서 운세 3종 카드 표시 (USE_OPENROUTER_MOCK이라 mock 응답)
- [ ] /tarot → 카드 뽑기 (1 크레딧 차감 확인)
- [ ] /dream → 꿈 입력 → 해석 (1 크레딧 차감)
- [ ] /billing → 3개 패키지 카드 표시
- [ ] /billing 충전 클릭 → Polar Sandbox checkout (test card 4242 4242 4242 4242)
- [ ] 결제 완료 후 /billing/success → 크레딧 적립 확인

- [ ] **Step 4: dev Supabase에서 결제 로그 확인**

```
mcp__supabase__execute_sql(
  project_id='<dev-ref>',
  query="select created_at, event, payload->>'amount' as amount from billing_log order by created_at desc limit 10;"
)
```

Expected: checkout_started + order.paid 레코드.

---

### Task 20: smoke workflow 수동 trigger 검증

- [ ] **Step 1: master 최신 상태 확인**

```bash
git checkout master
git pull origin master
```

- [ ] **Step 2: workflow_dispatch로 수동 trigger**

```bash
gh workflow run smoke.yml
```

- [ ] **Step 3: 실행 결과 확인**

```bash
gh run list --workflow=smoke.yml --limit 1
gh run watch
```

Expected: 모든 step PASS:
- "4 landings return 200" ✓
- "SEO assets return 200" ✓
- "Protected child routes redirect (307)" ✓

---

## 최종 검증 체크리스트

- [ ] master 브랜치 protection 활성, 직접 push 차단됨
- [ ] develop 브랜치 protection 활성, 직접 push 차단됨
- [ ] PR 생성 시 CI 자동 트리거됨
- [ ] CI 통과 안 하면 머지 버튼 비활성화됨
- [ ] develop push → dev 도메인 자동 배포됨
- [ ] master push → 운영 도메인 자동 배포 + smoke workflow 자동 trigger됨
- [ ] dev 도메인 4개 랜딩 + SEO 자산 200
- [ ] dev Supabase에 운영 마이그레이션 전부 적용됨
- [ ] dev 환경 OAuth (Google/Kakao) 로그인 동작
- [ ] dev 환경 Polar sandbox 결제 동작 + webhook 도착
- [ ] `USE_OPENROUTER_MOCK=true` 환경에서 AI 호출 mock 응답 반환

모두 OK면 환경 분리 완료.

---

## 참고

- 운영 사용자 데이터를 dev에 복제 금지 (PII)
- dev 데이터를 운영에 복제 금지 (테스트 노이즈)
- service_role_key는 Vercel env에만, git 커밋 금지
- Polar webhook secret은 환경별로 다른 값 사용
- Phase A 완료 후 develop 도입 전이므로 Phase A 7개 커밋만 master에 직접 push. Task 16 이후부터는 모든 변경 develop으로 PR.
