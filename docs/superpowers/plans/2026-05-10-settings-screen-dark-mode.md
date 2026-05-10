# 설정 화면 + 다크모드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신규 `/settings` 페이지(다크모드 토글 + 로그아웃)를 추가하고, `fortune-*` 토큰만 다크 매핑하여 SSR 쿠키 기반 다크모드를 적용한다.

**Architecture:** RootLayout이 요청 쿠키를 읽어 `<html class="dark">`를 결정 → CSS `.dark` variant가 fortune-* 토큰 재정의 → 모든 자식 자동 다크. 토글은 `useOptimistic` + server action(`cookies().set` + `revalidatePath('/', 'layout')`).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, lucide-react, Vitest. 기존 패턴(`@/` alias, `src/lib/fortune/__tests__/`, server actions in `src/app/actions/`).

**참조 스펙:** `docs/superpowers/specs/2026-05-10-settings-screen-dark-mode-design.md`

---

## File Structure (locked)

```
NEW src/lib/fortune/theme.ts
NEW src/lib/fortune/__tests__/theme.test.ts
NEW src/app/actions/theme.ts
NEW src/components/fortune/theme-toggle.tsx
NEW src/app/settings/page.tsx

MOD src/app/layout.tsx          (readTheme, generateViewport, html className)
MOD src/app/globals.css         (.dark 블록에 fortune-* 추가)
MOD src/components/fortune/app-header.tsx  (Settings 아이콘 추가)
MOD src/app/me/page.tsx         (로그아웃 form + signOut import + 버전 푸터 제거)
```

각 파일은 단일 책임. `theme.ts`는 쿠키 읽기/타입/상수만, `actions/theme.ts`는 쓰기/revalidate만, 컴포넌트는 표현만.

---

## Task 1: Theme 라이브러리 + 단위 테스트 (TDD)

**Files:**
- Create: `src/lib/fortune/theme.ts`
- Test: `src/lib/fortune/__tests__/theme.test.ts`

- [ ] **Step 1.1: 실패하는 테스트 작성**

`src/lib/fortune/__tests__/theme.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}))

import { readTheme } from '@/lib/fortune/theme'

describe('readTheme', () => {
  beforeEach(() => {
    cookieStore.get.mockReset()
  })

  it("returns 'light' when cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined)
    expect(await readTheme()).toBe('light')
  })

  it("returns 'dark' when cookie value is 'dark'", async () => {
    cookieStore.get.mockReturnValue({ value: 'dark' })
    expect(await readTheme()).toBe('dark')
  })

  it("returns 'light' when cookie value is 'light'", async () => {
    cookieStore.get.mockReturnValue({ value: 'light' })
    expect(await readTheme()).toBe('light')
  })

  it("falls back to 'light' for any non-'dark' value", async () => {
    for (const bad of ['foo', '', 'DARK', '1', 'true']) {
      cookieStore.get.mockReturnValue({ value: bad })
      expect(await readTheme()).toBe('light')
    }
  })
})
```

- [ ] **Step 1.2: 테스트 실행 (실패 확인)**

Run: `npm test -- theme`
Expected: FAIL — `Cannot find module '@/lib/fortune/theme'` 또는 비슷한 import 에러.

- [ ] **Step 1.3: 최소 구현**

`src/lib/fortune/theme.ts`:
```ts
import { cookies } from 'next/headers'

export type Theme = 'light' | 'dark'

export const THEME_COOKIE = 'theme'
export const THEME_MAX_AGE = 60 * 60 * 24 * 365  // 1 year

export async function readTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return value === 'dark' ? 'dark' : 'light'
}
```

- [ ] **Step 1.4: 테스트 실행 (통과 확인)**

Run: `npm test -- theme`
Expected: PASS — 4 tests passed.

- [ ] **Step 1.5: 전체 테스트 통과 확인 (회귀 방지)**

Run: `npm test`
Expected: PASS — 기존 27 + 신규 4 = 31 passed (또는 그 이상).

- [ ] **Step 1.6: 커밋**

```bash
git add src/lib/fortune/theme.ts src/lib/fortune/__tests__/theme.test.ts
git commit -m "feat(theme): add cookie-backed theme reader with whitelist fallback"
```

---

## Task 2: setTheme Server Action

**Files:**
- Create: `src/app/actions/theme.ts`

단위 테스트 없음 (사이드 이펙트 위주, mock ROI 낮음 — 스펙 §5-1).

- [ ] **Step 2.1: server action 작성**

`src/app/actions/theme.ts`:
```ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { THEME_COOKIE, THEME_MAX_AGE, type Theme } from '@/lib/fortune/theme'

export async function setTheme(next: Theme): Promise<void> {
  if (next !== 'light' && next !== 'dark') return
  const store = await cookies()
  store.set(THEME_COOKIE, next, {
    path: '/',
    maxAge: THEME_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2.2: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 2.3: 커밋**

```bash
git add src/app/actions/theme.ts
git commit -m "feat(theme): add setTheme server action with cookie + layout revalidate"
```

---

## Task 3: CSS 다크 토큰 매핑

**Files:**
- Modify: `src/app/globals.css` (115줄대 `.dark` 블록 끝에 fortune 토큰 추가)

- [ ] **Step 3.1: `.dark` 블록에 fortune-* 추가**

`src/app/globals.css`의 `.dark` 블록 안, 기존 shadcn 토큰들 뒤에 다음 추가 (`}` 직전):
```css
  /* fortune-* 다크 매핑 (DESIGN.md Known Gaps 채움 — MVP 범위) */
  --color-fortune-canvas: #0F1216;
  --color-fortune-surface-soft: #1A1E23;
  --color-fortune-ink-deep: #F5F6F7;
  --color-fortune-ink: #DDE1E4;
  --color-fortune-charcoal: #B5BCC2;
  --color-fortune-slate: #8A9299;
  --color-fortune-steel: #6F7780;
  --color-fortune-stone: #555C63;
  --color-fortune-hairline: #2A2F35;
  --color-fortune-hairline-soft: #1F242A;
  --color-fortune-primary-soft: #0F2640;
  /* primary, primary-deep, fb-blue, ink-button, warning, attention,
     success, critical, critical-strong, kakao, kakao-ink — 라이트 hex 그대로 유지 */
```

수정 후 `.dark { ... }` 블록의 끝(닫는 `}`)이 변하지 않는지 확인.

- [ ] **Step 3.2: dev 서버에서 깜빡 확인**

Run: `npm run dev` (백그라운드 OK), 브라우저에서 `http://localhost:3000` 열기.
DevTools Console에서:
```js
document.documentElement.classList.add('dark')
```
실행하면 페이지 배경/텍스트가 다크로 전환되는지 확인. 다시:
```js
document.documentElement.classList.remove('dark')
```
로 원복.
Expected: 라이트 ↔ 다크 전환이 즉시 반영. 카드 배경(`bg-fortune-canvas`, `bg-fortune-surface-soft`), 텍스트(`text-fortune-ink-deep` 등) 모두 토큰 따라 변함.

- [ ] **Step 3.3: dev 서버 종료, 커밋**

```bash
git add src/app/globals.css
git commit -m "feat(theme): map fortune-* tokens for .dark variant"
```

---

## Task 4: RootLayout 다크 적용

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 4.1: `viewport` → `generateViewport()`로 전환, RootLayout async + readTheme**

`src/app/layout.tsx` 전체를 다음으로 교체:
```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { readTheme } from "@/lib/fortune/theme";

export const metadata: Metadata = {
  title: "운세 — 오늘의 나, 가볍게",
  description: "매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.",
  applicationName: "Momentum",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Momentum",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme();
  return {
    themeColor: theme === "dark" ? "#0F1216" : "#FFFFFF",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await readTheme();
  const htmlClass = `h-full antialiased${theme === "dark" ? " dark" : ""}`;
  return (
    <html lang="ko" className={htmlClass}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
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

- [ ] **Step 4.2: TypeScript + 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

Run: `npm run dev`, `http://localhost:3000` 새 탭에서 새로고침. DevTools Application → Cookies에 `theme` 쿠키가 없는 상태에서 라이트로 정상 렌더되는지 확인.

DevTools Application → Cookies 탭에서 `theme=dark` 쿠키 직접 추가 (path `/`, max-age 1년):
```
theme  dark  localhost  /
```
새로고침. `<html>` 태그에 `dark` 클래스가 붙고 페이지가 다크로 렌더되는지 확인.
Expected: 새로고침 시 깜빡임 없이 다크.

쿠키 삭제 후 새로고침 → 라이트로 복귀.

- [ ] **Step 4.3: dev 서버 종료, 커밋**

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): SSR dark mode via cookie in RootLayout + viewport"
```

---

## Task 5: AppHeader Settings 아이콘 추가

**Files:**
- Modify: `src/components/fortune/app-header.tsx`

- [ ] **Step 5.1: Settings 링크 추가**

`src/components/fortune/app-header.tsx` 전체를 다음으로 교체:
```tsx
import Link from 'next/link'
import { Settings, User } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <Link href="/" aria-label="홈" className="text-lg font-bold tracking-tight text-fortune-ink-deep">
        운세
      </Link>
      <div className="flex items-center">
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

- [ ] **Step 5.2: 시각 확인**

Run: `npm run dev`, `http://localhost:3000` 새로고침.
헤더 우측에 톱니 아이콘과 사용자 아이콘 둘 다 보이는지 확인. 톱니 클릭 시 `/settings`로 이동(아직 페이지 없으므로 404 — 정상).

- [ ] **Step 5.3: dev 서버 종료, 커밋**

```bash
git add src/components/fortune/app-header.tsx
git commit -m "feat(header): add settings icon next to user icon"
```

---

## Task 6: ThemeToggle 클라이언트 컴포넌트

**Files:**
- Create: `src/components/fortune/theme-toggle.tsx`

- [ ] **Step 6.1: ThemeToggle 작성**

`src/components/fortune/theme-toggle.tsx`:
```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { Sun, Moon } from 'lucide-react'
import { setTheme } from '@/app/actions/theme'
import type { Theme } from '@/lib/fortune/theme'

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [optimistic, setOptimistic] = useOptimistic<Theme>(initial)
  const [, startTransition] = useTransition()

  const onPick = (next: Theme) => {
    if (next === optimistic) return
    startTransition(async () => {
      setOptimistic(next)
      await setTheme(next)
    })
  }

  return (
    <div role="radiogroup" aria-label="테마" className="inline-flex p-1 rounded-full bg-fortune-surface-soft">
      <Segment
        value="light"
        current={optimistic}
        onPick={onPick}
        icon={<Sun className="size-4" />}
        label="라이트"
      />
      <Segment
        value="dark"
        current={optimistic}
        onPick={onPick}
        icon={<Moon className="size-4" />}
        label="다크"
      />
    </div>
  )
}

function Segment({
  value,
  current,
  onPick,
  icon,
  label,
}: {
  value: Theme
  current: Theme
  onPick: (v: Theme) => void
  icon: React.ReactNode
  label: string
}) {
  const active = value === current
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onPick(value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
        active
          ? 'bg-fortune-canvas text-fortune-ink-deep shadow-[rgba(0,0,0,0.2)_1px_1px_0px_0px]'
          : 'text-fortune-charcoal'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
```

- [ ] **Step 6.2: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6.3: 커밋**

```bash
git add src/components/fortune/theme-toggle.tsx
git commit -m "feat(theme): add ThemeToggle segmented pill with optimistic updates"
```

---

## Task 7: /settings 페이지

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 7.1: settings 페이지 작성**

먼저 디렉토리 존재 여부 확인:
Run: `ls src/app/settings 2>NUL` (없으면 다음 단계에서 자동 생성됨)

`src/app/settings/page.tsx`:
```tsx
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { readTheme } from '@/lib/fortune/theme'
import { signOut } from '@/app/actions/profile'
import { ThemeToggle } from '@/components/fortune/theme-toggle'

export default async function SettingsPage() {
  const theme = await readTheme()

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft">
        <Link href="/" aria-label="뒤로" className="size-11 inline-flex items-center justify-center">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
        <span className="text-base font-bold text-fortune-ink-deep">설정</span>
        <span className="size-11" />
      </header>

      <section className="flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-fortune-ink-deep">외관</h2>
          <div className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-fortune-ink-deep">테마</span>
              <span className="text-xs font-bold text-fortune-charcoal">디바이스마다 따로 저장돼요</span>
            </div>
            <ThemeToggle initial={theme} />
          </div>
        </div>

        <hr className="border-fortune-hairline-soft" />

        <form action={signOut} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-fortune-ink-deep">계정</h2>
          <button
            type="submit"
            className="w-full h-[50px] rounded-full border-2 border-fortune-hairline bg-fortune-canvas text-sm font-bold text-fortune-critical"
          >
            로그아웃
          </button>
        </form>

        <p className="text-xs text-fortune-stone text-center">
          v0.1.0 · 도움이 필요하면{' '}
          <a href="mailto:help@momentum.app" className="underline">help@momentum.app</a>
        </p>
      </section>
    </main>
  )
}
```

- [ ] **Step 7.2: 시각 확인 — 토글 동작**

Run: `npm run dev`, `http://localhost:3000/settings` 접속.
1. 첫 방문 시 "라이트" segment 활성 확인.
2. "다크" 클릭 → 즉시 페이지가 다크로 전환되는지 확인.
3. F5 새로고침 → 다크 유지 확인.
4. "라이트" 클릭 → 즉시 라이트, 새로고침 후에도 라이트.
5. DevTools Application → Cookies에서 `theme` 쿠키가 set/update되는지 확인 (httpOnly, sameSite=Lax).

- [ ] **Step 7.3: 다른 페이지 다크 적용 확인**

다크 상태에서 다음 경로 모두 새로고침해 다크가 적용되는지 시각 확인:
- `/` (홈) — 카드 배경/텍스트 다크
- `/me` — 헤더/프로필 폼/계정 관리 다크
- `/history`
- `/insights`
- `/dream`

친구보기 / 이력 / 인사이트 카드의 파스텔 색은 라이트 색 그대로 유지(스펙 §1 Out of Scope) — 정상 동작.

- [ ] **Step 7.4: dev 서버 종료, 커밋**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(settings): add /settings page with theme toggle and sign out"
```

---

## Task 8: /me 정리 (로그아웃 + 푸터 제거)

**Files:**
- Modify: `src/app/me/page.tsx`

- [ ] **Step 8.1: import 정리 — `signOut` 제거**

`src/app/me/page.tsx`의 5번째 줄을 다음으로 변경:
```ts
import { getMyProfile } from '@/app/actions/profile'
```
(`signOut` 제거.)

- [ ] **Step 8.2: 로그아웃 form + 푸터 + 그 위 hr 제거**

`src/app/me/page.tsx`의 47–59줄(현재 기준)을 모두 삭제:
```tsx
        <hr className="border-fortune-hairline-soft" />

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
```

삭제 후 `<AccountActions />` 다음 바로 `</section>` `</main>`이 닫히는 구조가 되어야 함.

- [ ] **Step 8.3: TypeScript + 시각 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (`signOut` 미사용 경고도 없어야 함).

Run: `npm run dev`, `http://localhost:3000/me`
- 로그아웃 버튼 사라졌는지 확인.
- 버전 푸터(`v0.1.0`) 사라졌는지 확인.
- 프로필 폼, 관리자 카드(있다면), AccountActions(데이터 내보내기/삭제)는 그대로 표시되는지 확인.

- [ ] **Step 8.4: dev 서버 종료, 커밋**

```bash
git add src/app/me/page.tsx
git commit -m "refactor(me): move sign out and footer to /settings"
```

---

## Task 9: 빌드 + 전체 회귀 + 수동 체크리스트

**Files:** (없음, 검증만)

- [ ] **Step 9.1: 단위 테스트 전체 통과**

Run: `npm test`
Expected: 모든 테스트 PASS. 기존 27 + 신규 readTheme 4 = 최소 31 passed.

- [ ] **Step 9.2: 프로덕션 빌드 통과**

Run: `npm run build`
Expected: 빌드 성공. 타입 에러 없음. `/settings` 라우트가 빌드 산출물에 포함되는지 로그에서 확인.

- [ ] **Step 9.3: 수동 검증 체크리스트 (스펙 §5-3)**

`npm run dev` 후 브라우저에서 순서대로:

1. [ ] `/` 첫 방문 (쿠키 삭제 후) → 라이트로 시작
2. [ ] 헤더 톱니 클릭 → `/settings` 진입, "라이트" segment 활성
3. [ ] "다크" 클릭 → 즉시 다크 적용, 깜빡임 없음
4. [ ] F5 새로고침 → 다크 유지
5. [ ] `/`, `/me`, `/history`, `/insights`, `/dream`에서도 다크 적용 확인
6. [ ] 친구보기/이력/인사이트 카드 파스텔이 다크에서도 그대로 (Out of Scope 의도) 확인
7. [ ] `/settings` 로그아웃 클릭 → `/login`으로 리다이렉트
8. [ ] `/me` 들어가서 로그아웃 버튼이 사라졌는지 확인
9. [ ] DevTools Application → Cookies에 `theme=dark|light` (httpOnly: ✓, sameSite: Lax, max-age 1y) 확인
10. [ ] (선택) PWA 설치 후 status bar 색이 라이트(흰)/다크(어둠) 분기 확인 — Chrome DevTools "Application → Manifest"에서 install 가능

문제 발견 시 해당 Task로 돌아가 수정 후 다시 검증.

- [ ] **Step 9.4: dev 서버 종료. 추가 커밋 없음.**

(커밋할 변경 없음 — 이 Task는 검증만.)

---

## Self-Review Checklist (계획 작성자용 메모)

1. **Spec coverage** — 스펙의 각 섹션(§2 아키텍처, §3 구현, §4 에지 케이스, §5 테스트)이 Task로 매핑됨:
   - §3-1 → Task 1, §3-2 → Task 2, §3-3 → Task 4, §3-4 → Task 3, §3-5 → Task 5, §3-6 → Task 6, §3-7 → Task 7, §3-8 → Task 8.
   - §5 테스트 계획 → Task 1 (단위) + Task 9 (수동/빌드).
   - §4 에지 케이스: E1/E2는 Task 1 단위 테스트로 커버, E3는 `useOptimistic` 동작(Task 6 코드), E4는 별도 트랙(스코프 외), E5/E6은 Task 9 체크리스트 §5/6, E7은 Task 4(generateViewport) + Task 9 §10, E8은 Task 9 §8.

2. **No placeholders** — 모든 Step에 실제 코드/명령/예상 출력 포함. "TBD" 없음.

3. **Type/이름 일관성** — `Theme`, `THEME_COOKIE`, `THEME_MAX_AGE`, `readTheme`, `setTheme`, `ThemeToggle`이 모든 Task에서 동일 시그니처로 사용됨.
