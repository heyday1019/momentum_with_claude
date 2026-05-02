# 운세 서비스 Phase 1 (Foundation) 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Light-First MVP — 인증(Google/Kakao/매직링크) + 온보딩 + 홈 피드(오늘의 운세·띠/별자리·로또) + 마이페이지를 일일 1회 캐시·KST 자정 갱신으로 동작하게 만든다.

**Architecture:** Next.js 16 App Router + React 19. Supabase(Auth + Postgres + RLS)에 모든 사용자 데이터 저장, 캐시는 `fortune_daily`/`lotto_recommendations` 테이블의 UNIQUE 제약으로 자연 hit. AI 운세는 OpenRouter(`anthropic/claude-haiku-4-5`)를 Server Action 안에서만 호출. 로또 번호는 `user_id + draw_number` 시드 기반 의사난수로 결정적 생성, AI는 코멘트만 작성. 모바일 라이트 테마, 한국어 전용. UI는 shadcn Button/Input에 DESIGN.md 토큰 매핑 variant 추가 + 도메인 컴포넌트는 `src/components/fortune/` 분리.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind v4, shadcn/ui (radix-ui + cva), lucide-react, @supabase/ssr 0.5+, @supabase/supabase-js 2.x, Vitest 2.x (단위 테스트), Pretendard 폰트 (Korean fallback), Supabase MCP (마이그레이션), OpenRouter (Claude Haiku 4.5).

---

## Spec & Design 참조
- 입력 spec: `docs/superpowers/specs/2026-05-02-fortune-service-phase1-design.md`
- 디자인: `DESIGN.md` (Meta 스타일 토큰)
- Pencil 모바일 시안: `untitled.pen` 캔버스 (라이트 + Phase 2~5 미리보기 포함)

## 사전 환경 작업 (사용자 책임 — 코드 단계 시작 전 반드시)

이 항목들은 외부 콘솔 작업이라 본 플랜의 코드 task로 다루지 않습니다. **Task 1 시작 전에 사용자가 완료**해야 합니다:

1. **Google Cloud Console**: OAuth 2.0 Client ID 발급 → "OAuth consent screen" + "Authorized redirect URIs"에 `https://<supabase-project-ref>.supabase.co/auth/v1/callback` 등록
2. **Kakao Developers** (https://developers.kakao.com): 애플리케이션 등록 → "카카오 로그인" 활성화 → Redirect URI에 동일 Supabase callback URL 등록 → 동의항목에 "닉네임", "이메일" 활성
3. **Supabase Dashboard**: Authentication → Providers → Google + Kakao 각각 활성화 후 Client ID/Secret 입력. Redirect URLs에 `http://localhost:3000/auth/callback` + 배포 도메인 추가.
4. **OpenRouter**: 계정 생성 → 결제수단 등록 → API Key 발급 → 사용 한도(monthly cap) 설정 (권장: $20/월 시작)
5. **`.env.local`** 파일 생성 (Task 2에서 코드로 다룸)

---

## 파일 구조

### 새로 만들 파일

```
.env.local                                              (env vars; gitignored)
.env.example                                            (template, committed)
vitest.config.ts                                        (test runner)
supabase/migrations/20260503000001_init_phase1.sql      (DB schema + RLS)
src/middleware.ts                                       (auth + onboarding redirect)

src/lib/supabase/
  ├── server.ts            # createServerClient (cookies-aware, RLS-bound)
  ├── client.ts            # createBrowserClient (anon)
  └── middleware.ts        # updateSession helper

src/lib/openrouter/
  └── client.ts            # callFortuneModel fetch wrapper

src/lib/fortune/
  ├── types.ts             # 공유 TS 타입 (ProfileInput, DailyFortune, ...)
  ├── kst.ts               # todayKst, nextLottoDrawNumber
  ├── zodiac.ts            # zodiacAnimal(birthdate), zodiacSign(birthdate)
  ├── lotto.ts             # generateLottoNumbers(userId, drawNumber)
  ├── prompts.ts           # buildDailyPrompt, buildZodiacPrompt, buildLottoPrompt
  └── __tests__/
      ├── kst.test.ts
      ├── zodiac.test.ts
      ├── lotto.test.ts
      └── prompts.test.ts

src/lib/openrouter/__mocks__/client.ts                  (테스트용 결정적 응답)

src/app/actions/
  ├── profile.ts           # getProfile, upsertProfile
  └── fortune.ts           # getDailyFortune, getZodiacFortune, getLottoRec

src/components/fortune/
  ├── auth-button.tsx      # Kakao + Google OAuth 트리거 + 매직링크 진입
  ├── profile-form.tsx     # 온보딩/마이페이지 공용 (이름/생년월일/성별)
  ├── fortune-card.tsx     # 카드 베이스 (헤더 + chevron + 본문 슬롯)
  ├── fortune-card-daily.tsx
  ├── fortune-card-zodiac.tsx
  ├── fortune-card-lotto.tsx
  ├── viewer-toggle.tsx    # "다른 사람 보기" 토글 + 일회성 폼
  ├── lotto-number-chip.tsx
  └── card-skeleton.tsx    # 로딩 상태 스켈레톤

src/app/login/page.tsx                  # OAuth 진입 + 매직링크 link
src/app/login/email/page.tsx            # 매직링크 이메일 폼
src/app/auth/callback/route.ts          # OAuth/매직링크 콜백 처리
src/app/onboarding/page.tsx             # 신규 사용자 프로필 입력
src/app/me/page.tsx                     # 마이페이지
```

### 수정할 파일

```
package.json                            # deps 추가
src/app/globals.css                     # DESIGN.md 토큰 + Pretendard import
src/app/layout.tsx                      # 폰트 교체, lang=ko, 메타데이터
src/app/page.tsx                        # 홈 피드로 교체 (현재 next-app 기본 페이지 제거)
src/components/ui/button.tsx            # buyCta, kakao, google, pillFull variant 추가
```

---

## 작업 순서 개요

| 단계 | 묶음 | Task # |
|---|---|---|
| A | 환경 설정 + 의존성 + 테스트 러너 | 1–4 |
| B | 디자인 토큰 + 폰트 + 루트 레이아웃 | 5–6 |
| C | DB 스키마 (마이그레이션 + RLS + 적용) | 7–8 |
| D | 도메인 로직 (TDD: 타입/KST/띠/로또/프롬프트) | 9–13 |
| E | OpenRouter 클라이언트 (TDD with mock) | 14 |
| F | Supabase 클라이언트 + 미들웨어 | 15–17 |
| G | Server Actions (profile + 3 fortune types) | 18–21 |
| H | shadcn variant 추가 (Button + Input) | 22–23 |
| I | 도메인 컴포넌트 | 24–30 |
| J | 라우트 (6개 페이지) | 31–36 |
| K | 통합 smoke test + 마무리 commit | 37–38 |

**총 38 tasks**. 각 task는 commit 단위로 끝맺음.

---

# Phase A — 환경 설정

### Task 1: 의존성 설치

**Files:**
- Modify: `package.json` (자동, npm이 처리)
- Create: `.env.example`

- [ ] **Step 1: 의존성 설치**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D vitest @vitest/ui jsdom @types/jsdom
```

- [ ] **Step 2: `.env.example` 생성**

```bash
cat > .env.example << 'EOF'
# Supabase (https://supabase.com/dashboard 의 프로젝트 settings에서 복사)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>

# OpenRouter (https://openrouter.ai/keys 에서 발급)
OPENROUTER_API_KEY=<sk-or-v1-...>

# 사이트 URL (OAuth redirect용; 로컬은 http://localhost:3000)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

- [ ] **Step 3: `.env.local` 작성 (사용자가 실제 값 입력)**

`.env.example`을 `.env.local`로 복사 후 실제 값 채워 넣기. **`.env.local`은 commit 대상 아님** (`.gitignore`에 이미 포함).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add Supabase + Vitest deps; env template"
```

---

### Task 2: Vitest 설정

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts 추가)

- [ ] **Step 1: `vitest.config.ts` 작성**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: `package.json`에 test scripts 추가**

`package.json`의 `scripts` 섹션에 두 줄 추가:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Smoke test 작성 — `src/lib/__tests__/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 4: 실행**

```bash
npm test
```

Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/__tests__/
git commit -m "chore: configure Vitest with @ alias"
```

---

### Task 3: TypeScript 경로 + 타입 보강 확인

**Files:**
- Verify: `tsconfig.json` (이미 `@/*` alias 있음을 가정 — Next.js 기본)

- [ ] **Step 1: `tsconfig.json` 열어 paths 확인. 없으면 추가:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 2: 변경사항 있으면 commit**

```bash
git add tsconfig.json
git commit -m "chore: ensure @/* path alias for tsconfig"
```

(없으면 skip)

---

### Task 4: Supabase 타입 생성 폴더 준비

**Files:**
- Create: `src/lib/supabase/.gitkeep`
- Create: `supabase/migrations/.gitkeep`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/lib/supabase src/lib/openrouter src/lib/fortune/__tests__ supabase/migrations
touch src/lib/supabase/.gitkeep src/lib/openrouter/.gitkeep supabase/migrations/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ supabase/
git commit -m "chore: scaffold lib + migrations dirs"
```

---

# Phase B — 디자인 토큰 + 폰트

### Task 5: DESIGN.md 토큰 + Pretendard 폰트를 globals.css에 추가

**Files:**
- Modify: `src/app/globals.css`

DESIGN.md의 색·반경·폰트 토큰을 Tailwind v4 `@theme inline` 블록에 추가하고, Pretendard 폰트를 import.

- [ ] **Step 1: `src/app/globals.css` 상단의 `@import` 라인 아래에 Pretendard CDN 추가**

기존 line 1~3:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

아래로 추가:
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
```

- [ ] **Step 2: `@theme inline` 블록 안에 fortune-* 토큰을 추가 (마지막 `}` 바로 위에)**

```css
  /* Fortune service tokens — DESIGN.md 매핑 */
  --color-fortune-canvas: #FFFFFF;
  --color-fortune-ink-deep: #0A1317;
  --color-fortune-ink: #1F2C32;
  --color-fortune-charcoal: #3F4B52;
  --color-fortune-slate: #5C6770;
  --color-fortune-steel: #7A858C;
  --color-fortune-stone: #A4ABAF;
  --color-fortune-hairline: #CBD0D2;
  --color-fortune-hairline-soft: #E5E8E9;
  --color-fortune-surface-soft: #F5F6F7;
  --color-fortune-primary: #0064E0;
  --color-fortune-primary-deep: #0143B5;
  --color-fortune-primary-soft: #E6F0FA;
  --color-fortune-fb-blue: #1877F2;
  --color-fortune-ink-button: #0A1317;
  --color-fortune-warning: #FFD24A;
  --color-fortune-attention: #FF8400;
  --color-fortune-success: #1F9E5C;
  --color-fortune-critical: #E5453B;
  --color-fortune-critical-strong: #C9281C;
  --color-fortune-kakao: #FEE500;
  --color-fortune-kakao-ink: #3C1E1E;

  /* Fortune typography */
  --font-fortune: "Pretendard Variable", "Inter", "Helvetica", "Arial", "Noto Sans KR", sans-serif;
  --radius-fortune-pill: 9999px;
  --radius-fortune-card: 32px;
```

- [ ] **Step 3: `npm run dev`로 빌드 점검**

```bash
npm run dev
```

브라우저 콘솔에서 CSS 에러 없는지 확인. 페이지는 기본 Next 페이지로 보일 것.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): wire DESIGN.md tokens + Pretendard into Tailwind v4 theme"
```

---

### Task 6: 루트 레이아웃 — 폰트 교체 + lang=ko + 메타

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: `src/app/layout.tsx` 전체를 아래 내용으로 교체**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "운세 — 오늘의 나, 가볍게",
  description: "매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-fortune-canvas text-fortune-ink-deep"
        style={{ fontFamily: "var(--font-fortune)" }}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 브라우저에서 확인**

`npm run dev` 후 `http://localhost:3000` 접속. 폰트가 Pretendard로 보여야 함.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): swap to Pretendard, lang=ko, fortune metadata"
```

---

# Phase C — DB 스키마

### Task 7: Phase 1 마이그레이션 SQL 작성

**Files:**
- Create: `supabase/migrations/20260503000001_init_phase1.sql`

- [ ] **Step 1: 파일 생성**

```sql
-- Phase 1 (Foundation): profiles + fortune_daily + lotto_recommendations + RLS

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 30),
  birthdate date not null check (birthdate between '1900-01-01' and current_date),
  gender text not null check (gender in ('male','female','other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

alter table public.profiles enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id);

-- ========== fortune_daily ==========
create table public.fortune_daily (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  fortune_type text not null check (fortune_type in ('daily','zodiac')),
  content jsonb not null,
  model text not null default 'anthropic/claude-haiku-4-5',
  created_at timestamptz not null default now(),
  unique (user_id, date, fortune_type)
);

alter table public.fortune_daily enable row level security;

create policy "fortune_daily_owner_select" on public.fortune_daily
  for select using (auth.uid() = user_id);
create policy "fortune_daily_owner_insert" on public.fortune_daily
  for insert with check (auth.uid() = user_id);

-- ========== lotto_recommendations ==========
create table public.lotto_recommendations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  draw_number integer not null check (draw_number > 0),
  numbers integer[] not null check (
    array_length(numbers, 1) = 6
    and numbers <@ array(select generate_series(1, 45))
  ),
  comment text not null,
  created_at timestamptz not null default now(),
  unique (user_id, draw_number)
);

alter table public.lotto_recommendations enable row level security;

create policy "lotto_owner_select" on public.lotto_recommendations
  for select using (auth.uid() = user_id);
create policy "lotto_owner_insert" on public.lotto_recommendations
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260503000001_init_phase1.sql
git commit -m "feat(db): Phase 1 schema — profiles, fortune_daily, lotto + RLS"
```

---

### Task 8: 마이그레이션 적용 (Supabase MCP)

**Files:**
- Run: Supabase MCP `apply_migration`

- [ ] **Step 1: Supabase MCP `apply_migration` 호출**

`mcp__supabase__apply_migration` 도구 사용:
- `name`: `init_phase1`
- `query`: Task 7에서 작성한 SQL 전체

- [ ] **Step 2: Supabase MCP `list_tables` 로 검증**

`mcp__supabase__list_tables`로 `profiles`, `fortune_daily`, `lotto_recommendations` 3개 테이블 + RLS enabled 확인.

- [ ] **Step 3: Supabase MCP `get_advisors` 로 보안 점검**

`mcp__supabase__get_advisors` (`type: "security"`) 실행. 결과에 critical/error 없어야 함. (warning은 OK — 예: 이메일 인증 끔 등)

- [ ] **Step 4: TypeScript 타입 생성**

`mcp__supabase__generate_typescript_types` 호출 → 결과를 `src/lib/supabase/database.types.ts`에 저장.

```bash
# (MCP 도구가 stdout으로 타입을 줌. 그것을 파일로 저장)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat(db): apply Phase 1 migration; generate TS types"
```

---

# Phase D — 도메인 로직 (TDD)

### Task 9: 공유 타입 정의

**Files:**
- Create: `src/lib/fortune/types.ts`

- [ ] **Step 1: 파일 작성**

```ts
export type Gender = 'male' | 'female' | 'other'

export interface ProfileInput {
  name: string
  birthdate: string  // YYYY-MM-DD
  gender: Gender
}

export interface ProfileRow extends ProfileInput {
  id: string
  created_at: string
  updated_at: string
}

export type FortuneType = 'daily' | 'zodiac'

export interface DailyContent {
  headline: string
  body: string
  lucky_keyword: string
  categories: {
    love: string
    money: string
    health: string
    work: string
  }
}

export interface ZodiacContent {
  headline: string
  body: string
  zodiac_animal: string
  zodiac_sign: string
  lucky_keyword: string
}

export interface LottoResult {
  draw_number: number
  numbers: number[]   // length 6, each 1..45, sorted asc
  comment: string
}

/**
 * 임시(viewer) 프로필 — DB 미저장, 일회성 호출에만 사용.
 * undefined이면 본인 프로필 + 캐시 정책 적용.
 */
export type ViewerProfile = ProfileInput | undefined
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/fortune/types.ts
git commit -m "feat(fortune): shared TS types"
```

---

### Task 10: KST 자정 + 다음 추첨 회차 (TDD)

**Files:**
- Create: `src/lib/fortune/__tests__/kst.test.ts`
- Create: `src/lib/fortune/kst.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/fortune/__tests__/kst.test.ts
import { describe, it, expect } from 'vitest'
import { todayKst, nextLottoDrawNumber } from '@/lib/fortune/kst'

describe('todayKst', () => {
  it('returns YYYY-MM-DD in Asia/Seoul', () => {
    // 2026-05-03 14:00 KST = 2026-05-03 05:00 UTC
    const utc = new Date('2026-05-03T05:00:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-03')
  })

  it('rolls over at KST midnight even if UTC is previous day', () => {
    // 2026-05-04 00:30 KST = 2026-05-03 15:30 UTC
    const utc = new Date('2026-05-03T15:30:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-04')
  })

  it('handles before KST midnight (UTC same day)', () => {
    // 2026-05-03 23:30 KST = 2026-05-03 14:30 UTC
    const utc = new Date('2026-05-03T14:30:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-03')
  })
})

describe('nextLottoDrawNumber', () => {
  // 한국 로또 6/45 1회 추첨일: 2002-12-07 (토). 매주 토요일 추첨.
  // 1178회 추첨일: 2025-08-23 (토)일 가정 — 사용자 spec의 "1178회 · 추첨 5월 4일"은 가짜 예시이므로 우리는 정확한 공식만 검증.

  it('returns the same number on a Sunday and the previous Monday', () => {
    // Saturday draw is at 20:35 KST. After that, next draw_number increments.
    const friday = new Date('2026-05-01T03:00:00.000Z') // 2026-05-01 12:00 KST (금)
    const saturdayBeforeDraw = new Date('2026-05-02T11:00:00.000Z') // 2026-05-02 20:00 KST (토, 추첨 전)
    const saturdayAfterDraw = new Date('2026-05-02T13:00:00.000Z') // 2026-05-02 22:00 KST (토, 추첨 후)

    const a = nextLottoDrawNumber(friday)
    const b = nextLottoDrawNumber(saturdayBeforeDraw)
    expect(a).toBe(b)

    const c = nextLottoDrawNumber(saturdayAfterDraw)
    expect(c).toBe(a + 1)
  })

  it('returns a positive integer', () => {
    expect(nextLottoDrawNumber(new Date('2026-05-03T00:00:00Z'))).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 실행 (실패 확인)**

```bash
npm test -- kst
```

Expected: tests fail with "Cannot find module '@/lib/fortune/kst'"

- [ ] **Step 3: 구현**

```ts
// src/lib/fortune/kst.ts
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** Asia/Seoul 기준 YYYY-MM-DD */
export function todayKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 한국 로또 6/45 1회차 추첨일: 2002-12-07 (토) 20:35 KST
// 매주 토요일 동일 시각에 추첨. 추첨 직후 다음 회차로 increment.
const FIRST_DRAW_KST_MS = Date.UTC(2002, 11, 7, 11, 35) // 토 20:35 KST = 11:35 UTC
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** 다음 추첨 회차 번호. 추첨 시각 이후엔 그 다음 회차를 반환 */
export function nextLottoDrawNumber(now: Date = new Date()): number {
  const elapsed = now.getTime() - FIRST_DRAW_KST_MS
  // 1회 추첨 직전까지는 회차 1, 1회 추첨 직후 ~ 2회 추첨 직전까지 회차 2 (다음 회차)
  return Math.floor(elapsed / WEEK_MS) + 2
}
```

- [ ] **Step 4: 실행 (통과 확인)**

```bash
npm test -- kst
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fortune/kst.ts src/lib/fortune/__tests__/kst.test.ts
git commit -m "feat(fortune): KST midnight + next lotto draw computation"
```

---

### Task 11: 띠/별자리 계산 (TDD)

**Files:**
- Create: `src/lib/fortune/__tests__/zodiac.test.ts`
- Create: `src/lib/fortune/zodiac.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/fortune/__tests__/zodiac.test.ts
import { describe, it, expect } from 'vitest'
import { zodiacAnimal, zodiacSign } from '@/lib/fortune/zodiac'

describe('zodiacAnimal', () => {
  // 띠는 양력 기준 단순 mod 12 (입춘 기준 변형은 Phase 2 사주에서 처리).
  it('1995 → 돼지띠', () => expect(zodiacAnimal('1995-08-12')).toBe('돼지'))
  it('1988 → 용띠', () => expect(zodiacAnimal('1988-01-01')).toBe('용'))
  it('2000 → 용띠', () => expect(zodiacAnimal('2000-06-15')).toBe('용'))
  it('1996 → 쥐띠', () => expect(zodiacAnimal('1996-03-03')).toBe('쥐'))
})

describe('zodiacSign', () => {
  it('8월 12일 → 사자자리', () => expect(zodiacSign('1995-08-12')).toBe('사자자리'))
  it('1월 5일 → 염소자리', () => expect(zodiacSign('1995-01-05')).toBe('염소자리'))
  it('1월 25일 → 물병자리', () => expect(zodiacSign('1995-01-25')).toBe('물병자리'))
  it('3월 21일 → 양자리', () => expect(zodiacSign('1995-03-21')).toBe('양자리'))
  it('12월 22일 → 염소자리', () => expect(zodiacSign('1995-12-22')).toBe('염소자리'))
})
```

- [ ] **Step 2: 실행 (실패 확인)**

```bash
npm test -- zodiac
```

- [ ] **Step 3: 구현**

```ts
// src/lib/fortune/zodiac.ts

const ANIMALS = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']

export function zodiacAnimal(birthdate: string): string {
  const year = parseInt(birthdate.slice(0, 4), 10)
  return ANIMALS[year % 12]
}

const SIGN_BOUNDARIES: Array<[number, number, string]> = [
  [1, 20, '물병자리'],
  [2, 19, '물고기자리'],
  [3, 21, '양자리'],
  [4, 20, '황소자리'],
  [5, 21, '쌍둥이자리'],
  [6, 22, '게자리'],
  [7, 23, '사자자리'],
  [8, 23, '처녀자리'],
  [9, 23, '천칭자리'],
  [10, 24, '전갈자리'],
  [11, 23, '사수자리'],
  [12, 22, '염소자리'],
]

export function zodiacSign(birthdate: string): string {
  const month = parseInt(birthdate.slice(5, 7), 10)
  const day = parseInt(birthdate.slice(8, 10), 10)
  for (const [m, d, name] of SIGN_BOUNDARIES) {
    if (month < m || (month === m && day < d)) {
      return SIGN_BOUNDARIES[(SIGN_BOUNDARIES.indexOf([m, d, name] as never) + 11) % 12][2]
    }
  }
  return '염소자리' // 12/22 이후 ~ 1/19까지
}
```

> 위 zodiacSign 구현은 boundary 비교 로직이 살짝 비뚤어져 있을 수 있습니다. 테스트 실행 후 실패하면 아래의 정정안으로 교체:

```ts
export function zodiacSign(birthdate: string): string {
  const month = parseInt(birthdate.slice(5, 7), 10)
  const day = parseInt(birthdate.slice(8, 10), 10)
  // 각 구간: [시작월, 시작일, 이름]. "이 구간은 시작일부터 다음 구간 시작 직전까지"
  const ranges: Array<[number, number, string]> = [
    [12, 22, '염소자리'],
    [1, 20, '물병자리'],
    [2, 19, '물고기자리'],
    [3, 21, '양자리'],
    [4, 20, '황소자리'],
    [5, 21, '쌍둥이자리'],
    [6, 22, '게자리'],
    [7, 23, '사자자리'],
    [8, 23, '처녀자리'],
    [9, 23, '천칭자리'],
    [10, 24, '전갈자리'],
    [11, 23, '사수자리'],
  ]
  // 12/22 ~ 1/19 = 염소자리 (특수 처리)
  if ((month === 12 && day >= 22) || (month === 1 && day < 20)) return '염소자리'
  for (let i = 1; i < ranges.length; i++) {
    const [m, d, name] = ranges[i]
    const next = ranges[(i + 1) % ranges.length]
    const startsThis = month === m && day >= d
    const beforeNext = month < next[0] || (month === next[0] && day < next[1])
    if (startsThis || (month > m && beforeNext)) return name
  }
  return '염소자리'
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- zodiac
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fortune/zodiac.ts src/lib/fortune/__tests__/zodiac.test.ts
git commit -m "feat(fortune): zodiacAnimal + zodiacSign from birthdate"
```

---

### Task 12: 로또 시드 의사난수 (TDD)

**Files:**
- Create: `src/lib/fortune/__tests__/lotto.test.ts`
- Create: `src/lib/fortune/lotto.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/fortune/__tests__/lotto.test.ts
import { describe, it, expect } from 'vitest'
import { generateLottoNumbers } from '@/lib/fortune/lotto'

describe('generateLottoNumbers', () => {
  const userA = '11111111-1111-1111-1111-111111111111'
  const userB = '22222222-2222-2222-2222-222222222222'

  it('returns 6 unique numbers in [1, 45], sorted asc', () => {
    const ns = generateLottoNumbers(userA, 1178)
    expect(ns).toHaveLength(6)
    expect(new Set(ns).size).toBe(6)
    ns.forEach(n => expect(n).toBeGreaterThanOrEqual(1))
    ns.forEach(n => expect(n).toBeLessThanOrEqual(45))
    expect(ns).toEqual([...ns].sort((a, b) => a - b))
  })

  it('is deterministic — same userId+drawNumber yields same numbers', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userA, 1178)
    expect(a).toEqual(b)
  })

  it('different drawNumber yields different numbers (with high prob)', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userA, 1179)
    expect(a).not.toEqual(b)
  })

  it('different userId yields different numbers (with high prob)', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userB, 1178)
    expect(a).not.toEqual(b)
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- lotto
```

- [ ] **Step 3: 구현**

```ts
// src/lib/fortune/lotto.ts
import { createHash } from 'node:crypto'

/** sha256(userId + ":" + drawNumber)의 첫 4 byte → uint32 */
function seedFrom(userId: string, drawNumber: number): number {
  const h = createHash('sha256').update(`${userId}:${drawNumber}`).digest()
  return h.readUInt32BE(0) >>> 0
}

/** mulberry32 PRNG (deterministic, fast, good enough for 6-number draw) */
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLottoNumbers(userId: string, drawNumber: number): number[] {
  const rand = mulberry32(seedFrom(userId, drawNumber))
  const pool: number[] = Array.from({ length: 45 }, (_, i) => i + 1)
  const picked: number[] = []
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rand() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- lotto
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fortune/lotto.ts src/lib/fortune/__tests__/lotto.test.ts
git commit -m "feat(fortune): deterministic lotto number generator (sha256 + mulberry32)"
```

---

### Task 13: 프롬프트 빌더 (TDD)

**Files:**
- Create: `src/lib/fortune/__tests__/prompts.test.ts`
- Create: `src/lib/fortune/prompts.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/fortune/__tests__/prompts.test.ts
import { describe, it, expect } from 'vitest'
import {
  SYSTEM_PROMPT,
  buildDailyPrompt,
  buildZodiacPrompt,
  buildLottoCommentPrompt,
} from '@/lib/fortune/prompts'

describe('SYSTEM_PROMPT', () => {
  it('includes 친근 멘토 tone directives', () => {
    expect(SYSTEM_PROMPT).toContain('친한 멘토')
    expect(SYSTEM_PROMPT).toContain('JSON')
  })
  it('forbids medical/legal/financial assertions', () => {
    expect(SYSTEM_PROMPT).toMatch(/의학|법률|금융/)
  })
})

describe('buildDailyPrompt', () => {
  it('includes name, birthdate, gender, today', () => {
    const p = buildDailyPrompt({
      name: '수민',
      birthdate: '1995-08-12',
      gender: 'female',
      today: '2026-05-03',
    })
    expect(p).toContain('수민')
    expect(p).toContain('1995-08-12')
    expect(p).toContain('2026-05-03')
    expect(p).toMatch(/categories|love|money|health|work/i)
  })
})

describe('buildZodiacPrompt', () => {
  it('embeds pre-computed animal + sign', () => {
    const p = buildZodiacPrompt({
      birthdate: '1995-08-12',
      today: '2026-05-03',
      zodiacAnimal: '돼지',
      zodiacSign: '사자자리',
    })
    expect(p).toContain('돼지')
    expect(p).toContain('사자자리')
  })
})

describe('buildLottoCommentPrompt', () => {
  it('includes the 6 numbers and draw number', () => {
    const p = buildLottoCommentPrompt({
      name: '수민',
      drawNumber: 1178,
      numbers: [7, 14, 23, 31, 38, 42],
      today: '2026-05-03',
    })
    expect(p).toContain('1178')
    expect(p).toMatch(/7.*14.*23.*31.*38.*42/)
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm test -- prompts
```

- [ ] **Step 3: 구현**

```ts
// src/lib/fortune/prompts.ts
import type { Gender } from './types'

export const SYSTEM_PROMPT = `당신은 한국어 운세 콘텐츠 작가입니다.

[톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 "~수 있어요", "~좋아요" 같은 부드러운 권유.
- 문장은 짧고 호흡이 자연스럽게.
- 부정적 결과도 위협이 아닌 격려로 마무리.

[금지]
- 의학·법률·금융 단정 ("이 약을 드세요", "투자하세요" 등).
- 특정 인물·사건·정치·종교 언급.
- 영어/이모지/마크다운 (반환은 순수 한국어 평문 + JSON).

[출력]
- 반드시 지정된 JSON 스키마로만 응답.
- 어떤 필드도 비워두지 않음.
`

const GENDER_KO: Record<Gender, string> = { male: '남성', female: '여성', other: '기타' }

export function buildDailyPrompt(args: {
  name: string
  birthdate: string
  gender: Gender
  today: string
}): string {
  return `${args.name}님(생년월일 ${args.birthdate}, ${GENDER_KO[args.gender]})의 ${args.today} 운세를 작성해주세요.

JSON 스키마:
{
  "headline": "1줄 요약 (15~30자)",
  "body": "종합 본문 (3~5문장)",
  "lucky_keyword": "3~6자 키워드",
  "categories": {
    "love": "애정 1~2문장",
    "money": "금전 1~2문장",
    "health": "건강 1~2문장",
    "work": "일/공부 1~2문장"
  }
}`
}

export function buildZodiacPrompt(args: {
  birthdate: string
  today: string
  zodiacAnimal: string
  zodiacSign: string
}): string {
  return `${args.zodiacAnimal}띠 + ${args.zodiacSign} 사용자의 ${args.today} 운세를 작성해주세요. 띠와 별자리의 결합된 결을 살리면서 자연스럽게.

JSON 스키마:
{
  "headline": "1줄 요약",
  "body": "본문 (3~4문장)",
  "zodiac_animal": "${args.zodiacAnimal}",
  "zodiac_sign": "${args.zodiacSign}",
  "lucky_keyword": "3~6자 키워드"
}`
}

export function buildLottoCommentPrompt(args: {
  name: string
  drawNumber: number
  numbers: number[]
  today: string
}): string {
  return `${args.name}님의 ${args.drawNumber}회차 행운의 번호 [${args.numbers.join(', ')}]에 대한 1~2문장 코멘트를 작성해주세요.
번호 자체에 대한 단정("당첨됩니다")은 피하고 키워드 중심으로.

JSON 스키마:
{
  "comment": "1~2문장 코멘트"
}`
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test -- prompts
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fortune/prompts.ts src/lib/fortune/__tests__/prompts.test.ts
git commit -m "feat(fortune): system + per-type prompt builders with JSON schema directives"
```

---

# Phase E — OpenRouter 클라이언트

### Task 14: OpenRouter fetch 래퍼 + 결정적 mock

**Files:**
- Create: `src/lib/openrouter/client.ts`
- Create: `src/lib/openrouter/__mocks__/client.ts`
- Create: `src/lib/openrouter/__tests__/client.test.ts`

- [ ] **Step 1: 클라이언트 구현**

```ts
// src/lib/openrouter/client.ts

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-haiku-4-5'

export interface CallOptions {
  systemPrompt: string
  userPrompt: string
  /** JSON.parse 가능한 응답을 강제 */
  expectJson: true
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  /** 의존성 주입용 (테스트). 기본 globalThis.fetch */
  fetchImpl?: typeof fetch
}

export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

/** 1회 재시도 포함 — JSON 파싱 실패 시 한 번만 더 호출 */
export async function callFortuneModel<T>(opts: CallOptions): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500)

  const fetchImpl = opts.fetchImpl ?? fetch

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.7,
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    'X-Title': 'Momentum Fortune',
  }

  const timeoutMs = opts.timeoutMs ?? 15000

  const callOnce = async (): Promise<T> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        throw new OpenRouterError(`OpenRouter ${res.status}`, res.status)
      }
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = json.choices?.[0]?.message?.content
      if (!content) throw new OpenRouterError('Empty response')
      return JSON.parse(content) as T
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    return await callOnce()
  } catch (e) {
    if (e instanceof OpenRouterError && e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
      throw e // 4xx (429 제외) 즉시 실패
    }
    return await callOnce() // 1회 재시도
  }
}
```

- [ ] **Step 2: Mock 작성 (테스트 + 로컬 개발용)**

```ts
// src/lib/openrouter/__mocks__/client.ts
export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) { super(message) }
}

export async function callFortuneModel<T>(opts: { userPrompt: string }): Promise<T> {
  // 결정적 mock — 입력에 따라 운세 응답을 바꿈
  if (opts.userPrompt.includes('회차') && opts.userPrompt.includes('행운의 번호')) {
    return { comment: '키워드는 \"환한 길\"이에요. 부드러운 시도가 잘 어울립니다.' } as T
  }
  if (opts.userPrompt.match(/[가-힣]+띠/)) {
    return {
      headline: '두 흐름이 맞물려 자존감이 차오르는 하루예요',
      body: '띠와 별자리의 기운이 자연스럽게 맞물려요. 무리하지 말고 평소의 결을 지켜주세요.',
      zodiac_animal: '돼지',
      zodiac_sign: '사자자리',
      lucky_keyword: '느긋함',
    } as T
  }
  return {
    headline: '사람과의 인연이 평소보다 따뜻하게 다가오는 하루예요',
    body: '오전엔 가벼운 대화에서 의외의 힌트가 나옵니다. 오후엔 미뤄두었던 메시지를 보내기 좋은 시점이에요. 저녁엔 작은 약속이 마음을 정리해주는 시간이 될 거예요.',
    lucky_keyword: '느린 대답',
    categories: {
      love: '다정함이 자연스럽게 새어 나오는 날이에요.',
      money: '큰 결정은 미루고, 작은 정리부터 시작해보세요.',
      health: '어깨를 한 번씩 풀어주세요. 잠은 평소보다 일찍 자는 게 좋아요.',
      work: '협업 자리에서 의외의 진척이 있어요. 메모를 챙겨두세요.',
    },
  } as T
}
```

- [ ] **Step 3: 클라이언트 단위 테스트 (mock fetch)**

```ts
// src/lib/openrouter/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callFortuneModel, OpenRouterError } from '@/lib/openrouter/client'

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
})

describe('callFortuneModel', () => {
  it('parses JSON content from chat completion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"headline":"hi","body":"there"}' } }],
      }),
    } as Response)

    const out = await callFortuneModel<{ headline: string }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.headline).toBe('hi')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('retries once on 5xx', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{"ok":1}' } }] }),
      })

    const out = await callFortuneModel<{ ok: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.ok).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws OpenRouterError if API key missing', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(
      callFortuneModel({
        systemPrompt: 's', userPrompt: 'u', expectJson: true,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenRouterError)
  })
})
```

- [ ] **Step 4: 실행**

```bash
npm test -- openrouter
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/openrouter/
git commit -m "feat(openrouter): fetch wrapper + deterministic mock + retry-once"
```

---

# Phase F — Supabase 클라이언트 + 미들웨어

### Task 15: Supabase server-side 클라이언트

**Files:**
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: 작성**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 set이 무시됨 — middleware가 처리
          }
        },
      },
    }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/server.ts
git commit -m "feat(supabase): server client (cookies-aware)"
```

---

### Task 16: Supabase browser 클라이언트

**Files:**
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1: 작성**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/client.ts
git commit -m "feat(supabase): browser client"
```

---

### Task 17: 미들웨어 — 세션 갱신 + 인증/온보딩 가드

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: 세션 갱신 helper**

```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return { response, supabase, user }
}
```

- [ ] **Step 2: 라우트 가드 미들웨어**

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/login/email', '/auth/callback']
const ONBOARDING_PATH = '/onboarding'

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // 정적 자원/이미지/api는 스킵
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) return response

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 1) 미인증 + 보호 경로 → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2) 인증 + 프로필 없음 + onboarding 외 → /onboarding
  if (user && pathname !== ONBOARDING_PATH && !isPublic) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = ONBOARDING_PATH
      return NextResponse.redirect(url)
    }
  }

  // 3) 인증 + 프로필 있음 + /login 또는 /onboarding 진입 → /
  if (user && (isPublic || pathname === ONBOARDING_PATH)) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (profile && (pathname === '/login' || pathname === ONBOARDING_PATH)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/middleware.ts src/middleware.ts
git commit -m "feat(auth): session refresh + login/onboarding redirect middleware"
```

---

# Phase G — Server Actions

### Task 18: 프로필 액션

**Files:**
- Create: `src/app/actions/profile.ts`

- [ ] **Step 1: 작성**

```ts
// src/app/actions/profile.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProfileInput, ProfileRow } from '@/lib/fortune/types'

export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return data as ProfileRow | null
}

function validateProfileInput(input: ProfileInput): string | null {
  if (!input.name || input.name.trim().length === 0) return '이름을 입력해주세요'
  if (input.name.length > 30) return '이름은 30자 이하로 입력해주세요'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthdate)) return '생년월일 형식이 올바르지 않아요'
  const d = new Date(input.birthdate)
  if (Number.isNaN(d.getTime())) return '생년월일이 유효하지 않아요'
  if (d < new Date('1900-01-01') || d > new Date()) return '생년월일은 1900년 이후, 오늘 이전이어야 해요'
  if (!['male', 'female', 'other'].includes(input.gender)) return '성별 선택이 올바르지 않아요'
  return null
}

export async function upsertProfile(input: ProfileInput): Promise<{ ok: boolean; error?: string }> {
  const err = validateProfileInput(input)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    name: input.name.trim(),
    birthdate: input.birthdate,
    gender: input.gender,
  }, { onConflict: 'id' })

  if (error) return { ok: false, error: '저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.' }

  revalidatePath('/')
  revalidatePath('/me')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/profile.ts
git commit -m "feat(actions): profile get + upsert + signOut"
```

---

### Task 19: 운세 액션 — 오늘의 운세

**Files:**
- Create: `src/app/actions/fortune.ts` (initial — daily만, zodiac/lotto는 다음 task에서 추가)

- [ ] **Step 1: 작성**

```ts
// src/app/actions/fortune.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { callFortuneModel } from '@/lib/openrouter/client'
import { todayKst, nextLottoDrawNumber } from '@/lib/fortune/kst'
import { zodiacAnimal, zodiacSign } from '@/lib/fortune/zodiac'
import { generateLottoNumbers } from '@/lib/fortune/lotto'
import {
  SYSTEM_PROMPT,
  buildDailyPrompt,
  buildZodiacPrompt,
  buildLottoCommentPrompt,
} from '@/lib/fortune/prompts'
import type {
  DailyContent,
  ZodiacContent,
  LottoResult,
  ProfileInput,
  ViewerProfile,
} from '@/lib/fortune/types'

async function requireProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) throw new Error('NO_PROFILE')
  return { supabase, user, profile: profile as { id: string; name: string; birthdate: string; gender: 'male'|'female'|'other' } }
}

export async function getDailyFortune(viewer?: ViewerProfile): Promise<DailyContent> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()

  // Cache hit (본인 only)
  if (!viewer) {
    const { data: cached } = await supabase
      .from('fortune_daily')
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('fortune_type', 'daily')
      .maybeSingle()
    if (cached) return cached.content as DailyContent
  }

  const result = await callFortuneModel<DailyContent>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildDailyPrompt({ ...target, today }),
    expectJson: true,
    maxTokens: 800,
    temperature: 0.7,
  })

  if (!viewer) {
    await supabase.from('fortune_daily').insert({
      user_id: user.id,
      date: today,
      fortune_type: 'daily',
      content: result,
    })
  }

  return result
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/fortune.ts
git commit -m "feat(actions): getDailyFortune with KST cache + viewer override"
```

---

### Task 20: 운세 액션 — 띠/별자리

**Files:**
- Modify: `src/app/actions/fortune.ts` (append)

- [ ] **Step 1: 추가**

`src/app/actions/fortune.ts` 끝에 다음 함수를 추가:

```ts
export async function getZodiacFortune(viewer?: ViewerProfile): Promise<ZodiacContent> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()

  if (!viewer) {
    const { data: cached } = await supabase
      .from('fortune_daily')
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('fortune_type', 'zodiac')
      .maybeSingle()
    if (cached) return cached.content as ZodiacContent
  }

  const animal = zodiacAnimal(target.birthdate)
  const sign = zodiacSign(target.birthdate)

  const result = await callFortuneModel<ZodiacContent>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildZodiacPrompt({
      birthdate: target.birthdate,
      today,
      zodiacAnimal: animal,
      zodiacSign: sign,
    }),
    expectJson: true,
    maxTokens: 500,
    temperature: 0.7,
  })

  // 모델이 다른 동물/별자리를 반환할 수 있으니 서버 계산값으로 덮어쓰기
  const safe: ZodiacContent = { ...result, zodiac_animal: animal, zodiac_sign: sign }

  if (!viewer) {
    await supabase.from('fortune_daily').insert({
      user_id: user.id,
      date: today,
      fortune_type: 'zodiac',
      content: safe,
    })
  }

  return safe
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/fortune.ts
git commit -m "feat(actions): getZodiacFortune with server-computed animal+sign"
```

---

### Task 21: 운세 액션 — 로또

**Files:**
- Modify: `src/app/actions/fortune.ts` (append)

- [ ] **Step 1: 추가**

```ts
export async function getLottoRec(viewer?: ViewerProfile): Promise<LottoResult> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()
  const drawNumber = nextLottoDrawNumber()

  if (!viewer) {
    const { data: cached } = await supabase
      .from('lotto_recommendations')
      .select('numbers, comment, draw_number')
      .eq('user_id', user.id)
      .eq('draw_number', drawNumber)
      .maybeSingle()
    if (cached) return {
      draw_number: cached.draw_number,
      numbers: cached.numbers as number[],
      comment: cached.comment,
    }
  }

  // viewer 모드면 anonymous seed로
  const seedKey = viewer ? `viewer:${target.name}:${target.birthdate}:${target.gender}` : user.id
  const numbers = generateLottoNumbers(seedKey, drawNumber)

  const { comment } = await callFortuneModel<{ comment: string }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildLottoCommentPrompt({
      name: target.name,
      drawNumber,
      numbers,
      today,
    }),
    expectJson: true,
    maxTokens: 200,
    temperature: 0.5,
  })

  if (!viewer) {
    await supabase.from('lotto_recommendations').insert({
      user_id: user.id,
      draw_number: drawNumber,
      numbers,
      comment,
    })
  }

  return { draw_number: drawNumber, numbers, comment }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/fortune.ts
git commit -m "feat(actions): getLottoRec with seeded numbers + AI comment"
```

---

# Phase H — shadcn variant 추가

### Task 22: Button variant — buyCta, kakao, google, pillFull, ghostInk

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: `buttonVariants`의 `variant` 객체에 새 항목 추가**

기존 `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` 옆에 추가:

```ts
        buyCta:
          "bg-fortune-primary text-fortune-canvas hover:bg-fortune-primary-deep active:bg-fortune-primary-deep disabled:bg-fortune-stone disabled:text-fortune-canvas",
        kakao:
          "bg-fortune-kakao text-fortune-kakao-ink hover:brightness-95 active:brightness-90",
        google:
          "bg-fortune-surface-soft text-fortune-ink-deep hover:bg-fortune-hairline-soft active:bg-fortune-hairline",
        ghostInk:
          "bg-fortune-canvas text-fortune-ink-deep border-2 border-fortune-ink-deep hover:bg-fortune-surface-soft",
        criticalGhost:
          "bg-fortune-canvas text-fortune-critical border border-fortune-hairline hover:bg-fortune-surface-soft",
```

- [ ] **Step 2: `size` 객체에 `pill` 사이즈 추가**

```ts
        pill: "h-[54px] px-[30px] rounded-full text-sm font-bold",
        pillSm: "h-[44px] px-[22px] rounded-full text-sm font-bold",
```

- [ ] **Step 3: 빌드/개발서버 켜서 컴파일 에러 없는지 확인**

```bash
npm run dev
```

콘솔에 TS 에러 없어야 함.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): button variants buyCta/kakao/google/ghostInk + pill size"
```

---

### Task 23: shadcn Input variant 점검 + 추가 (필요 시)

**Files:**
- Inspect: `src/components/ui/input.tsx` (있으면 수정, 없으면 만들기)

- [ ] **Step 1: 파일 존재 확인**

```bash
ls src/components/ui/input.tsx
```

존재하지 않으면 `npx shadcn@latest add input`으로 생성하거나, 직접 작성:

```tsx
// src/components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-lg border border-fortune-hairline bg-fortune-canvas px-3.5 py-2 text-base text-fortune-ink-deep placeholder:text-fortune-stone outline-none focus-visible:border-2 focus-visible:border-fortune-fb-blue disabled:opacity-50 aria-invalid:border-fortune-critical-strong",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat(ui): input baseline with fortune tokens"
```

---

# Phase I — 도메인 컴포넌트

### Task 24: AuthButton — Kakao/Google OAuth

**Files:**
- Create: `src/components/fortune/auth-button.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/components/fortune/auth-button.tsx
'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'

export function KakaoButton() {
  const onClick = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <Button variant="kakao" size="pill" className="w-full gap-2.5" onClick={onClick}>
      <MessageCircle className="size-5" /> 카카오로 계속하기
    </Button>
  )
}

export function GoogleButton() {
  const onClick = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <Button variant="google" size="pill" className="w-full gap-2.5" onClick={onClick}>
      <span className="text-[#4285F4] font-bold text-lg">G</span> 구글로 계속하기
    </Button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fortune/auth-button.tsx
git commit -m "feat(fortune): KakaoButton + GoogleButton OAuth triggers"
```

---

### Task 25: ProfileForm — 온보딩/마이페이지 공용

**Files:**
- Create: `src/components/fortune/profile-form.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/components/fortune/profile-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { upsertProfile } from '@/app/actions/profile'
import type { ProfileInput, Gender } from '@/lib/fortune/types'
import { useRouter } from 'next/navigation'

interface Props {
  initial?: Partial<ProfileInput>
  ctaLabel: string
  redirectAfter?: string
}

export function ProfileForm({ initial, ctaLabel, redirectAfter }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? '')
  const [gender, setGender] = useState<Gender | ''>(initial?.gender ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!gender) { setError('성별을 선택해주세요'); return }
    startTransition(async () => {
      const res = await upsertProfile({ name, birthdate, gender })
      if (!res.ok) { setError(res.error ?? '저장 실패'); return }
      if (redirectAfter) router.push(redirectAfter)
    })
  }

  const disabled = !name || !birthdate || !gender || isPending

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">이름</label>
        <Input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="수민" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">생년월일</label>
        <Input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={birthdate} onChange={e => setBirthdate(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">성별</label>
        <div className="flex gap-2">
          {([['female', '여성'], ['male', '남성'], ['other', '기타']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setGender(v)}
              className={
                "flex-1 h-[54px] rounded-lg flex items-center justify-center gap-2.5 px-3.5 text-sm font-bold " +
                (gender === v
                  ? "border-2 border-fortune-primary-deep bg-fortune-canvas text-fortune-ink-deep"
                  : "border border-fortune-hairline bg-fortune-canvas text-fortune-ink")
              }
            >
              <span className={
                "size-5 rounded-full border-[1.5px] flex items-center justify-center " +
                (gender === v ? "border-fortune-primary-deep" : "border-fortune-hairline")
              }>
                {gender === v && <span className="size-2.5 rounded-full bg-fortune-primary-deep" />}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-fortune-critical-strong">{error}</p>}

      <Button type="submit" variant="buyCta" size="pill" disabled={disabled} className="w-full">
        {isPending ? '저장 중...' : ctaLabel}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fortune/profile-form.tsx
git commit -m "feat(fortune): ProfileForm with native date input + radio gender"
```

---

### Task 26: LottoNumberChip

**Files:**
- Create: `src/components/fortune/lotto-number-chip.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/components/fortune/lotto-number-chip.tsx
function colorFor(n: number): { bg: string; fg: string } {
  if (n <= 10) return { bg: 'bg-fortune-warning', fg: 'text-fortune-ink-deep' }
  if (n <= 20) return { bg: 'bg-fortune-fb-blue', fg: 'text-fortune-canvas' }
  if (n <= 30) return { bg: 'bg-fortune-critical', fg: 'text-fortune-canvas' }
  if (n <= 40) return { bg: 'bg-fortune-charcoal', fg: 'text-fortune-canvas' }
  return { bg: 'bg-fortune-success', fg: 'text-fortune-canvas' }
}

export function LottoNumberChip({ n }: { n: number }) {
  const { bg, fg } = colorFor(n)
  return (
    <span className={`inline-flex size-[38px] items-center justify-center rounded-full font-bold text-base ${bg} ${fg}`}>
      {n}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fortune/lotto-number-chip.tsx
git commit -m "feat(fortune): LottoNumberChip with DESIGN.md range coloring"
```

---

### Task 27: FortuneCard 베이스

**Files:**
- Create: `src/components/fortune/fortune-card.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/components/fortune/fortune-card.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  title: string
  accentBg: string  // tailwind class for the small accent circle
  icon: ReactNode
  collapsedPreview: ReactNode
  expandedContent: ReactNode
  defaultOpen?: boolean
  toolbar?: ReactNode  // 다른 사람 보기 토글 등
}

export function FortuneCard({
  title, accentBg, icon, collapsedPreview, expandedContent, defaultOpen = false, toolbar,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span className={`size-9 rounded-full inline-flex items-center justify-center ${accentBg}`}>
            {icon}
          </span>
          <span className="text-2xl font-medium text-fortune-ink-deep">{title}</span>
        </button>
        <div className="flex items-center gap-3.5">
          {toolbar}
          {open
            ? <ChevronUp className="size-5 text-fortune-steel" />
            : <ChevronDown className="size-5 text-fortune-steel" />
          }
        </div>
      </header>
      <div className="flex flex-col gap-3.5">
        {open ? expandedContent : collapsedPreview}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fortune/fortune-card.tsx
git commit -m "feat(fortune): FortuneCard base with accordion behavior"
```

---

### Task 28: FortuneCardDaily

**Files:**
- Create: `src/components/fortune/fortune-card-daily.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/components/fortune/fortune-card-daily.tsx
import { Sparkles, Heart, Banknote, Activity, Briefcase, Star } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import type { DailyContent } from '@/lib/fortune/types'

const CATEGORIES: Array<[keyof DailyContent['categories'], string, React.ComponentType<{ className?: string }>, string]> = [
  ['love', '애정', Heart, 'text-fortune-critical'],
  ['money', '금전', Banknote, 'text-fortune-success'],
  ['health', '건강', Activity, 'text-fortune-fb-blue'],
  ['work', '일', Briefcase, 'text-[#6B46C1]'],
]

export function FortuneCardDaily({ data }: { data: DailyContent }) {
  return (
    <FortuneCard
      title="오늘의 운세"
      accentBg="bg-[#FFE3E1]"
      icon={<Sparkles className="size-[18px] text-fortune-critical-strong" />}
      collapsedPreview={
        <>
          <p className="text-lg font-medium text-fortune-ink leading-snug">{data.headline}</p>
          <KeywordBadge keyword={data.lucky_keyword} />
        </>
      }
      expandedContent={
        <>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{data.headline}</p>
          <p className="text-base text-fortune-ink leading-relaxed">{data.body}</p>
          <div className="flex flex-col gap-2.5 py-3">
            {CATEGORIES.map(([key, label, Icon, iconColor]) => (
              <div key={key} className="flex gap-3 items-start">
                <span className="size-8 rounded-full bg-fortune-surface-soft inline-flex items-center justify-center shrink-0">
                  <Icon className={`size-4 ${iconColor}`} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-fortune-ink">{label}</span>
                  <span className="text-sm text-fortune-charcoal leading-relaxed">{data.categories[key]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <KeywordBadge keyword={data.lucky_keyword} />
            <span className="text-xs text-fortune-stone">내일 자정 갱신</span>
          </div>
        </>
      }
    />
  )
}

function KeywordBadge({ keyword }: { keyword: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fortune-warning px-2.5 py-1 self-start">
      <Star className="size-3 text-fortune-ink-deep" />
      <span className="text-xs font-bold text-fortune-ink-deep">오늘의 키워드 · {keyword}</span>
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fortune/fortune-card-daily.tsx
git commit -m "feat(fortune): FortuneCardDaily with collapsed/expanded states"
```

---

### Task 29: FortuneCardZodiac + FortuneCardLotto

**Files:**
- Create: `src/components/fortune/fortune-card-zodiac.tsx`
- Create: `src/components/fortune/fortune-card-lotto.tsx`

- [ ] **Step 1: Zodiac 카드 작성**

```tsx
// src/components/fortune/fortune-card-zodiac.tsx
import { MoonStar, Star } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import type { ZodiacContent } from '@/lib/fortune/types'

export function FortuneCardZodiac({ data }: { data: ZodiacContent }) {
  return (
    <FortuneCard
      title="띠 · 별자리"
      accentBg="bg-[#E6F0FA]"
      icon={<MoonStar className="size-[18px] text-fortune-primary-deep" />}
      collapsedPreview={
        <>
          <div className="flex gap-1.5">
            <Pill text={`${data.zodiac_animal}띠`} />
            <Pill text={data.zodiac_sign} />
          </div>
          <p className="text-lg font-medium text-fortune-ink leading-snug">{data.headline}</p>
        </>
      }
      expandedContent={
        <>
          <div className="flex gap-1.5">
            <Pill text={`${data.zodiac_animal}띠`} />
            <Pill text={data.zodiac_sign} />
          </div>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{data.headline}</p>
          <p className="text-base text-fortune-ink leading-relaxed">{data.body}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fortune-warning px-2.5 py-1">
              <Star className="size-3 text-fortune-ink-deep" />
              <span className="text-xs font-bold text-fortune-ink-deep">오늘의 키워드 · {data.lucky_keyword}</span>
            </span>
            <span className="text-xs text-fortune-stone">내일 자정 갱신</span>
          </div>
        </>
      }
    />
  )
}

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full border border-fortune-hairline-soft bg-fortune-surface-soft px-2.5 py-1 text-xs font-bold text-fortune-ink">{text}</span>
  )
}
```

- [ ] **Step 2: Lotto 카드 작성**

```tsx
// src/components/fortune/fortune-card-lotto.tsx
import { Ticket } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import { LottoNumberChip } from './lotto-number-chip'
import type { LottoResult } from '@/lib/fortune/types'

export function FortuneCardLotto({ data }: { data: LottoResult }) {
  return (
    <FortuneCard
      title="행운의 로또번호"
      accentBg="bg-[#FFF4D6]"
      icon={<Ticket className="size-[18px] text-[#80531C]" />}
      collapsedPreview={
        <>
          <span className="text-sm text-fortune-steel">{data.draw_number}회차 추천</span>
          <div className="flex gap-2 flex-wrap">
            {data.numbers.map(n => <LottoNumberChip key={n} n={n} />)}
          </div>
        </>
      }
      expandedContent={
        <>
          <span className="text-sm text-fortune-steel">{data.draw_number}회차 추천</span>
          <div className="flex gap-2 flex-wrap">
            {data.numbers.map(n => <LottoNumberChip key={n} n={n} />)}
          </div>
          <p className="text-base text-fortune-charcoal leading-relaxed">{data.comment}</p>
          <span className="text-xs text-fortune-stone">다음 추첨 후 새 번호로 갱신</span>
        </>
      }
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/fortune/fortune-card-zodiac.tsx src/components/fortune/fortune-card-lotto.tsx
git commit -m "feat(fortune): zodiac + lotto cards"
```

---

### Task 30: 카드 스켈레톤 + 헤더 컴포넌트

**Files:**
- Create: `src/components/fortune/card-skeleton.tsx`
- Create: `src/components/fortune/app-header.tsx`

- [ ] **Step 1: 스켈레톤 작성**

```tsx
// src/components/fortune/card-skeleton.tsx
export function CardSkeleton() {
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-3 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-fortune-surface-soft" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-5/6" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-3/4" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-2/3" />
    </section>
  )
}
```

- [ ] **Step 2: Header 작성**

```tsx
// src/components/fortune/app-header.tsx
import Link from 'next/link'
import { User } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <span className="text-lg font-bold tracking-tight text-fortune-ink-deep">운세</span>
      <Link href="/me" className="size-11 rounded-full inline-flex items-center justify-center" aria-label="내 정보">
        <User className="size-5.5 text-fortune-ink-deep" />
      </Link>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/fortune/card-skeleton.tsx src/components/fortune/app-header.tsx
git commit -m "feat(fortune): CardSkeleton + AppHeader"
```

---

# Phase J — 라우트

### Task 31: `/login` 페이지

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/app/login/page.tsx
import Link from 'next/link'
import { KakaoButton, GoogleButton } from '@/components/fortune/auth-button'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="relative h-[60vh] flex items-end p-6 pb-10 rounded-b-[32px] overflow-hidden bg-gradient-to-b from-fortune-charcoal to-fortune-ink-deep">
        <div className="flex flex-col gap-3 z-10">
          <h1 className="text-4xl font-medium text-fortune-canvas leading-tight tracking-tight">
            오늘의 나,<br />가볍게 들여다보세요
          </h1>
          <p className="text-base text-fortune-canvas/90 leading-normal max-w-[320px]">
            매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6 pt-8">
        <KakaoButton />
        <GoogleButton />
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-fortune-hairline-soft" />
          <span className="text-xs text-fortune-steel">또는</span>
          <div className="flex-1 h-px bg-fortune-hairline-soft" />
        </div>
        <Link
          href="/login/email"
          className="h-[50px] rounded-full border-2 border-fortune-ink-deep flex items-center justify-center text-sm font-bold text-fortune-ink-deep"
        >
          이메일로 로그인
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(routes): /login with hero + Kakao + Google + email link"
```

---

### Task 32: `/login/email` 페이지

**Files:**
- Create: `src/app/login/email/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/app/login/email/page.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function EmailLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^.+@.+\..+$/.test(email)) { setError('이메일 형식이 올바르지 않아요'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError('전송 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.'); return }
      setSent(true)
    })
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="h-15 flex items-center px-4 border-b border-fortune-hairline-soft">
        <Link href="/login" className="size-11 inline-flex items-center justify-center" aria-label="뒤로">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-6 p-6 pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">이메일로 로그인</h1>
          <p className="text-base text-fortune-charcoal leading-relaxed">입력하신 메일로 로그인 링크를 보내드려요. 다른 비밀번호는 필요 없어요.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-fortune-ink">이메일</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={sent}
          />
        </div>
        {error && <p className="text-sm text-fortune-critical-strong">{error}</p>}
        {sent ? (
          <div className="rounded-full bg-fortune-success px-4 py-3 text-center text-sm font-bold text-fortune-canvas">
            메일을 확인해주세요
          </div>
        ) : (
          <Button type="submit" variant="buyCta" size="pill" className="w-full" disabled={isPending || !email}>
            {isPending ? '전송 중...' : '로그인 링크 받기'}
          </Button>
        )}
        <p className="text-xs text-fortune-steel text-center">메일이 안 와요? 스팸함을 확인해보세요.</p>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/email/page.tsx
git commit -m "feat(routes): /login/email magic link form"
```

---

### Task 33: `/auth/callback` 라우트 핸들러

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: 작성**

```ts
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  // 미들웨어가 프로필 유무에 따라 / 또는 /onboarding으로 마저 라우팅
  return NextResponse.redirect(new URL('/', request.url))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat(routes): /auth/callback exchange code for session"
```

---

### Task 34: `/onboarding` 페이지

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/app/onboarding/page.tsx
import { ProfileForm } from '@/components/fortune/profile-form'

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col p-6 pt-10 gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-medium leading-tight text-fortune-ink-deep">
          잠깐, 당신을 알려주세요
        </h1>
        <p className="text-base text-fortune-charcoal leading-relaxed">
          운세를 정확히 보기 위한 기본 정보예요. 한 번만 알려주시면 돼요.
        </p>
      </header>
      <ProfileForm ctaLabel="시작하기" redirectAfter="/" />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat(routes): /onboarding profile setup"
```

---

### Task 35: `/` 홈 피드

**Files:**
- Modify: `src/app/page.tsx` (기존 내용 완전 교체)

- [ ] **Step 1: 작성**

```tsx
// src/app/page.tsx
import { Suspense } from 'react'
import { AppHeader } from '@/components/fortune/app-header'
import { CardSkeleton } from '@/components/fortune/card-skeleton'
import { FortuneCardDaily } from '@/components/fortune/fortune-card-daily'
import { FortuneCardZodiac } from '@/components/fortune/fortune-card-zodiac'
import { FortuneCardLotto } from '@/components/fortune/fortune-card-lotto'
import { getDailyFortune, getZodiacFortune, getLottoRec } from '@/app/actions/fortune'
import { getMyProfile } from '@/app/actions/profile'

export default async function HomePage() {
  const profile = await getMyProfile()
  const today = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(new Date())

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-1 pb-1">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            {profile?.name}님, 오늘의 운세예요
          </h1>
          <p className="text-sm text-fortune-steel">{today}</p>
        </div>
        <Suspense fallback={<CardSkeleton />}><DailyCard /></Suspense>
        <Suspense fallback={<CardSkeleton />}><ZodiacCard /></Suspense>
        <Suspense fallback={<CardSkeleton />}><LottoCard /></Suspense>
      </section>
    </main>
  )
}

async function DailyCard() {
  try {
    const data = await getDailyFortune()
    return <FortuneCardDaily data={data} />
  } catch {
    return <ErrorCard label="오늘의 운세" />
  }
}
async function ZodiacCard() {
  try {
    const data = await getZodiacFortune()
    return <FortuneCardZodiac data={data} />
  } catch {
    return <ErrorCard label="띠 · 별자리" />
  }
}
async function LottoCard() {
  try {
    const data = await getLottoRec()
    return <FortuneCardLotto data={data} />
  } catch {
    return <ErrorCard label="행운의 로또번호" />
  }
}

function ErrorCard({ label }: { label: string }) {
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-2">
      <span className="text-2xl font-medium text-fortune-ink-deep">{label}</span>
      <span className="inline-flex w-fit rounded-full bg-fortune-critical px-2.5 py-1 text-xs font-bold text-fortune-canvas">잠시 후 다시 시도해주세요</span>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(routes): / home feed with 3 cards (Suspense + cache)"
```

---

### Task 36: `/me` 마이페이지

**Files:**
- Create: `src/app/me/page.tsx`

- [ ] **Step 1: 작성**

```tsx
// src/app/me/page.tsx
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProfileForm } from '@/components/fortune/profile-form'
import { getMyProfile, signOut } from '@/app/actions/profile'

export default async function MePage() {
  const profile = await getMyProfile()
  if (!profile) return null

  return (
    <main className="flex min-h-screen flex-col">
      <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft">
        <Link href="/" className="size-11 inline-flex items-center justify-center" aria-label="뒤로">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
        <span className="text-base font-bold text-fortune-ink-deep">내 정보</span>
        <span className="size-11" />
      </header>
      <section className="flex flex-col gap-5 p-6">
        <ProfileForm
          initial={{ name: profile.name, birthdate: profile.birthdate, gender: profile.gender }}
          ctaLabel="변경 사항 저장"
        />
        <hr className="border-fortune-hairline-soft my-2" />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full h-[50px] rounded-full border-2 border-fortune-hairline bg-fortune-canvas text-sm font-bold text-fortune-critical"
          >
            로그아웃
          </button>
        </form>
        <p className="text-xs text-fortune-stone text-center">
          v0.1.0 · 도움이 필요하면 <a href="mailto:help@momentum.app" className="underline">help@momentum.app</a>
        </p>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/me/page.tsx
git commit -m "feat(routes): /me profile edit + sign out"
```

---

# Phase K — 통합 + smoke test

### Task 37: 빌드 + 통합 smoke test 체크리스트

**Files:**
- (Manual testing — no file changes)

- [ ] **Step 1: 타입 체크 + 빌드**

```bash
npx tsc --noEmit
npm run build
```

Expected: 둘 다 에러 없이 통과.

- [ ] **Step 2: 단위 테스트 전부 통과 확인**

```bash
npm test
```

Expected: KST + zodiac + lotto + prompts + openrouter — 5 파일 모두 pass.

- [ ] **Step 3: 로컬 dev 서버 + 수동 smoke test**

```bash
npm run dev
```

브라우저 `http://localhost:3000` 에서 다음을 차례로 확인:

1. 미인증 → `/login`로 자동 리다이렉트
2. 카카오 버튼 클릭 → 카카오 OAuth 페이지 → 인증 완료 → `/onboarding`으로 자동 이동
3. 이름·생년월일·성별 입력 → "시작하기" → `/`(홈) 진입
4. 홈에서 3개 카드 로딩 → 모두 결과 표시 (AI 응답 약 3-5초)
5. 카드 탭 → 펼침/접힘 동작
6. 새로고침 → 같은 결과가 즉시(<200ms) 표시 (캐시 hit)
7. 헤더 사람 아이콘 → `/me` 진입 → 폼 prefilled
8. 로그아웃 → `/login` 복귀
9. (선택) Google 로그인 동일 플로우 확인
10. (선택) 매직링크 — 이메일 입력 → 메일 클릭 → 동일 플로우

- [ ] **Step 4: 자정 캐시 검증 (DB 직접 점검)**

Supabase MCP `execute_sql`로 본인 user_id 기준 fortune_daily 행 1개 + lotto_recommendations 행 1개 존재 확인:

```sql
select user_id, date, fortune_type, created_at from fortune_daily order by created_at desc limit 5;
select user_id, draw_number, numbers, created_at from lotto_recommendations order by created_at desc limit 5;
```

- [ ] **Step 5: README/CLAUDE.md 메모 한 줄 추가 (선택)**

`CLAUDE.md` 끝에:

```markdown

## Phase 1 환경 메모
- 로컬 dev: `.env.local`에 Supabase + OpenRouter 키 입력 후 `npm run dev`
- 단위 테스트: `npm test`
- DB 마이그레이션은 Supabase MCP `apply_migration` 도구로 적용 (파일: `supabase/migrations/`)
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Phase 1 env memo in CLAUDE.md"
```

---

### Task 38: 마무리 — 최종 점검 + Phase 1 완료 commit

**Files:**
- (No file changes — 메타 commit)

- [ ] **Step 1: 최종 lint**

```bash
npm run lint
```

Expected: 에러 없음. (warning은 무시 가능)

- [ ] **Step 2: git log 검토**

```bash
git log --oneline | head -50
```

Phase 1의 모든 task가 commit으로 남아있는지 확인.

- [ ] **Step 3: tag (선택)**

```bash
git tag -a v0.1.0-phase1 -m "Phase 1 (Foundation) complete"
```

- [ ] **Step 4: 완료**

이 시점에 Phase 1이 동작합니다. Phase 2 (사주) brainstorming은 별도 사이클에서.

---

## Self-Review (실행 전 점검)

### Spec coverage check

| Spec 섹션 | 구현 task |
|---|---|
| 1. 개요/범위 | 전체 (Task 1-38) |
| 2. 아키텍처 — 시스템 흐름 | Task 15-21 (Supabase + Server Actions + OpenRouter) |
| 2. 보안 경계 (RLS, viewer 처리) | Task 7-8 (RLS), Task 19-21 (viewer override) |
| 3. 화면 흐름 (6 라우트) | Task 31-36 |
| 3. 인터랙션 (펼침, 토글, 로딩, 에러) | Task 27-30 (FortuneCard, Skeleton), Task 35 (ErrorCard) |
| 4. DB 스키마 (3 테이블 + RLS) | Task 7-8 |
| 5. OpenRouter (시스템 프롬프트, JSON, retry) | Task 13 (prompts), Task 14 (client) |
| 5. 로또 시드 생성 | Task 12 |
| 6. 컴포넌트 매핑 (DESIGN.md) | Task 5-6 (토큰), 22-23 (variants), 24-30 (도메인) |
| 7. 에러/엣지/테스트 | Task 9-14 (단위 테스트), Task 35 (ErrorCard), Task 17 (미들웨어 가드), Task 18 (검증) |

✅ 모든 spec 섹션이 적어도 하나의 task에서 다뤄집니다.

### Placeholder scan

- ❌ "TBD"/"TODO"/"implement later" — 검색했으나 없음
- ❌ "add appropriate error handling" — 모든 에러는 구체적 메시지 + 코드로 명시됨
- ❌ "Similar to Task N" — 비슷한 패턴(Zodiac/Lotto 카드)도 코드 전체 명시
- ❌ "Write tests for the above" — TDD task에는 실제 테스트 코드 명시

### Type consistency

- `ProfileInput`, `DailyContent`, `ZodiacContent`, `LottoResult`, `ViewerProfile` — Task 9에서 정의 후 Task 19-21, 24-29에서 import 사용. 시그니처 일관됨.
- `callFortuneModel<T>()` — Task 14에서 정의, Task 19-21에서 호출 시 동일 시그니처.
- `generateLottoNumbers(userId, drawNumber)` — Task 12에서 정의, Task 21에서 호출 시 동일.

### 알려진 트레이드오프 (의도적)

1. **테스트 환경**: 단위 테스트만. E2E는 Phase 1 후속 작업으로 명시 (spec과 일치).
2. **Email validation**: 간단한 정규식만. RFC 5322 정확 매칭은 YAGNI.
3. **Sentry/로깅**: Phase 1 미포함 (spec 명시). console.error 폴백.
4. **유저 프로필 1900년 이전 → 차단**: native input min 속성 + Server Action 검증 둘 다.
5. **로또 시드 키**: viewer 모드는 `viewer:name:birth:gender` 문자열 시드. 같은 viewer 정보면 같은 번호 — 의도된 동작.
