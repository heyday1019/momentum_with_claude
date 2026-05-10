# 설정 화면 + 다크모드 설계 명세

**작성일**: 2026-05-10
**범위**: 신규 `/settings` 페이지 + 다크모드 토글 (라이트/다크). 기존 `/me`에서 로그아웃 이전.
**선행 컨텍스트**: 2026-05-02 Phase 1 출시 후, 1차 기능 확장.

---

## 1. 배경 & 목표

### 무엇을
- 홈 헤더에서 진입하는 **별도 `/settings` 페이지**를 신설하고, 거기에 **다크모드 토글**과 **로그아웃**을 둔다.
- 기존 `/me`(내 정보 · 설정)에서 **로그아웃 form을 제거**한다 (단일 책임).

### 왜
- 현재 `/me`는 프로필 편집 + 계정 관리 + 관리자 진입까지 책임이 비대. "앱 환경"(다크모드)이 새로 들어오면 더 모호해진다.
- 다크모드는 사용자 빈도가 높은 토글이라 **빠른 진입점이 헤더에 직접 노출**되는 것이 자연스럽다.

### 결정 사항 요약 (브레인스토밍 합의)
| 결정 | 값 |
|---|---|
| 설정 위치 | 별도 `/settings` 페이지 신설 |
| `/settings` 항목 범위 | 다크모드 + 로그아웃만 (최소 책임) |
| `/me` 정리 | 로그아웃 제거. 프로필 + 데이터 관리 + 관리자 진입은 유지 |
| 다크모드 옵션 | 라이트 / 다크 2단 토글 (시스템 추종 X) |
| 저장 위치 | **서버 쿠키** (디바이스별, 디바이스 간 동기화 X) |
| 적용 메커니즘 | RootLayout SSR + Server Action 토글 (FOUC 0) |
| 색 작업 범위 | `fortune-*` 토큰만 다크 매핑. 인라인 hex 카드는 라이트 색 유지 |

### 성공 기준
1. `/` 첫 방문이 라이트로 시작하고, `/settings`에서 다크 토글 후 새로고침해도 다크 유지.
2. 토글 클릭에서 시각 변화까지 깜빡임(FOUC) 없음.
3. `/me`에서 로그아웃 버튼이 사라졌고, `/settings`에서 동일 동작.
4. 기존 단위 테스트 27개 + 신규 추가분 모두 통과.

### Out of Scope
- 친구보기 / 이력 / 인사이트 카드의 파스텔 hex (`#EAF2FB`, `#F4ECDD`, `#EDE7F8` 계열)는 다크에서 라이트 색 그대로. 향후 풀 다크 작업 시 토큰화.
- 타로 / 꿈 그라데이션 카드는 이미 어두워 다크에서도 자연. 변경 없음.
- 시스템 prefers-color-scheme 추종.
- 디바이스 간 동기화 (DB 저장).
- 알림 / 언어 / 도움말 등 다른 설정 항목.
- 관리자 대시보드(`/admin`)의 다크 미세 조정은 토큰 매핑으로 자동 처리되는 범위까지만. 차트 색은 별도 트랙.
- `revalidatePath('/', 'layout')`이 운세 server action에 미치는 잠재 비용 검토 (별도 트랙: "운세 비용" 트래킹 작업이 추후 추가될 예정이라 그 작업과 함께 다룬다).

---

## 2. 아키텍처

### 라우팅 & 진입
```
/ (홈)
└─ 헤더 우측: [Settings 아이콘] /settings  + [User 아이콘] /me
   ├─ /settings    NEW · 외관(다크모드) + 계정(로그아웃)
   └─ /me          MOD · 프로필 + 데이터 관리 + (관리자 진입). 로그아웃 제거.
```

### 데이터 흐름 (다크모드 적용)

```
[브라우저 요청]
   │ Cookie: theme=dark|light|<none>
   ▼
[RootLayout (server)]
   ├─ readTheme()  → 'light' | 'dark'
   └─ <html className={theme === 'dark' ? '... dark' : '...'}>
   ▼
[CSS .dark variant]
   └─ fortune-* 토큰 재정의 → 모든 자식 자동 다크
   ▼
[사용자 토글 (/settings)]
   ├─ ThemeToggle → useOptimistic UI 즉시 갱신
   └─ setTheme(next) server action
        ├─ cookies().set('theme', next, { httpOnly, sameSite: 'lax', maxAge: 1y })
        └─ revalidatePath('/', 'layout')
   ▼
[다음 RSC payload] → <html className> 갱신 → DOM 클래스 토글
```

### 신규 파일 / 수정 파일 인벤토리
```
NEW src/lib/fortune/theme.ts            · Theme 타입, readTheme(), 쿠키 상수
NEW src/app/actions/theme.ts            · setTheme(next) server action
NEW src/app/settings/page.tsx           · /settings 페이지
NEW src/components/fortune/theme-toggle.tsx  · 클라이언트 토글 컴포넌트 (useOptimistic)
NEW src/lib/fortune/theme.test.ts       · readTheme 단위 테스트

MOD src/app/layout.tsx                  · RootLayout이 readTheme(), <html> 클래스, generateViewport
MOD src/app/globals.css                 · .dark 블록에 fortune-* 토큰 다크 값 추가
MOD src/components/fortune/app-header.tsx  · Settings 아이콘 추가
MOD src/app/me/page.tsx                 · 로그아웃 form + signOut import 제거. 버전 푸터도 /settings로 이전
```

---

## 3. 구현 명세

### 3-1. 단일 진실 원천: `src/lib/fortune/theme.ts`

```ts
import { cookies } from 'next/headers'

export type Theme = 'light' | 'dark'
export const THEME_COOKIE = 'theme'
export const THEME_MAX_AGE = 60 * 60 * 24 * 365  // 1년

export async function readTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return value === 'dark' ? 'dark' : 'light'  // 화이트리스트, 기본 light
}
```

**근거**
- 화이트리스트 매칭(`'dark'`만 통과)으로 깨진 쿠키 값 자동 폴백.
- 비대칭 기본값(`light`)은 사용자 결정. 시스템 추종 안 함.

### 3-2. 토글 server action: `src/app/actions/theme.ts`

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

**근거**
- `httpOnly: true` — 클라이언트 JS는 쿠키 직접 안 읽음. UI는 DOM `class`만 보면 충분.
- `revalidatePath('/', 'layout')` — `RootLayout`이 쿠키 의존이므로 layout 단위 무효화. 다음 네비게이션부터 새 테마 SSR.

### 3-3. RootLayout 수정: `src/app/layout.tsx`

```tsx
import { readTheme } from '@/lib/fortune/theme'

export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme()
  return {
    themeColor: theme === 'dark' ? '#0F1216' : '#FFFFFF',
    width: 'device-width', initialScale: 1, maximumScale: 1,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await readTheme()
  const htmlClass = `h-full antialiased${theme === 'dark' ? ' dark' : ''}`
  return (
    <html lang="ko" className={htmlClass}>
      <head>...</head>
      <body className="min-h-full flex flex-col bg-fortune-canvas text-fortune-ink-deep" style={{ fontFamily: 'var(--font-fortune)' }}>
        {children}
      </body>
    </html>
  )
}
```

**근거**
- `viewport`가 `Viewport` 객체에서 `generateViewport()` async 함수로 전환 — 쿠키 의존이라 동적이어야 함.
- 기존 고정 `themeColor: '#1A1B3D'`는 어떤 테마와도 안 맞아 라이트/다크 분기.

### 3-4. CSS 다크 토큰: `src/app/globals.css`

기존 `.dark` 블록(115줄대) 끝에 fortune 토큰 추가:
```css
.dark {
  /* (기존 shadcn 토큰 유지) */

  /* fortune-* 다크 매핑 */
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
}
```

**근거**
- canvas/surface-soft를 `#0F1216`/`#1A1E23` 두 단계로 띄워 카드 구조 유지.
- ink-deep을 순백(`#FFFFFF`) 대신 off-white(`#F5F6F7`)로 — OLED 번짐 완화.
- hairline은 매우 어두움. 카드 윤곽보다 명도차로 구조 표현.
- 강조색(코발트, critical, warning 등)은 브랜드 일관성을 위해 라이트와 동일.

### 3-5. AppHeader: `src/components/fortune/app-header.tsx`

```tsx
import { Settings, User } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <Link href="/" aria-label="홈" className="text-lg font-bold tracking-tight text-fortune-ink-deep">운세</Link>
      <div className="flex items-center">
        <Link href="/settings" aria-label="설정" className="size-11 rounded-full inline-flex items-center justify-center">
          <Settings className="size-5.5 text-fortune-ink-deep" />
        </Link>
        <Link href="/me" aria-label="내 정보" className="size-11 rounded-full inline-flex items-center justify-center">
          <User className="size-5.5 text-fortune-ink-deep" />
        </Link>
      </div>
    </header>
  )
}
```

**근거**
- size-11(44px)로 두 아이콘 모두 WCAG AAA 터치 타깃 충족. 사이 시각적 간격은 자체 패딩으로 충분.

### 3-6. ThemeToggle: `src/components/fortune/theme-toggle.tsx`

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
      <Segment value="light" current={optimistic} onPick={onPick} icon={<Sun className="size-4" />} label="라이트" />
      <Segment value="dark"  current={optimistic} onPick={onPick} icon={<Moon className="size-4" />} label="다크" />
    </div>
  )
}

function Segment({ value, current, onPick, icon, label }: {
  value: Theme; current: Theme; onPick: (v: Theme) => void; icon: React.ReactNode; label: string
}) {
  const active = value === current
  return (
    <button
      type="button" role="radio" aria-checked={active}
      onClick={() => onPick(value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors
        ${active
          ? 'bg-fortune-canvas text-fortune-ink-deep shadow-[rgba(0,0,0,0.2)_1px_1px_0px_0px]'
          : 'text-fortune-charcoal'}`}
    >
      {icon}{label}
    </button>
  )
}
```

**근거**
- DESIGN.md에 토글 정의가 없어 `radio-option`(p.8) 패턴을 segmented pill 형태로 차용.
- `useOptimistic`으로 클릭 즉시 시각 변화. 실제 DOM `.dark` 토글은 server action이 끝난 뒤 `revalidatePath` 결과 RSC payload로 매끄럽게 이어짐.
- 활성 그림자는 DESIGN.md "Elevation level 1" 토큰 그대로.

### 3-7. /settings 페이지: `src/app/settings/page.tsx`

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
        {/* 외관 */}
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

        {/* 계정 */}
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
          v0.1.0 · 도움이 필요하면 <a href="mailto:help@momentum.app" className="underline">help@momentum.app</a>
        </p>
      </section>
    </main>
  )
}
```

**근거**
- 헤더는 기존 `/me`와 동일 패턴 — ChevronLeft + 중앙 타이틀 + 빈 슬롯(균형).
- "외관" / "계정" 두 섹션 사이 `<hr>`은 DESIGN.md의 hairline-soft 활용. 다크에서도 토큰으로 자동 어둠.
- 버전 + 도움말 푸터를 `/me` → `/settings`로 통째 이전. 한 곳에서만 노출.

### 3-8. /me 변경: `src/app/me/page.tsx`

- `import { getMyProfile, signOut } from '@/app/actions/profile'` → `signOut` 제거.
- `<form action={signOut}>...</form>` 블록(49-56줄) 제거.
- 그 위 `<hr />` (47줄)도 함께 제거 (시각적 공백 방지).
- 버전 푸터 (`v0.1.0 · help@momentum.app`) 제거. 동일 푸터를 `/settings` 하단에서만 노출.

---

## 4. 에지 케이스

| ID | 시나리오 | 처리 |
|---|---|---|
| E1 | 첫 방문, 쿠키 없음 | `readTheme()` → `'light'` 폴백. 토글 UI는 "라이트" 활성 |
| E2 | 쿠키 값 깨짐 (예: `theme=foo`) | 화이트리스트 매칭으로 라이트 폴백 |
| E3 | server action 실패 (네트워크 끊김) | `useOptimistic` 자동 롤백 → UI 이전 상태로. 토스트 없음 |
| E4 | `revalidatePath('/', 'layout')` 부수효과 | 운세 server action들은 DB 캐시(`fortunes` daily 행) 우선 → AI 재호출 없음. 비용 트래킹은 별도 트랙 |
| E5 | 타로 / 꿈 그라데이션 카드 다크에서 | 이미 어두워 자연. 변경 없음 |
| E6 | 친구보기 / 이력 / 인사이트 파스텔 카드 다크에서 | 라이트 색 유지 (Out of Scope). 약간 들뜸은 의도된 트레이드오프 |
| E7 | PWA 설치 후 status bar | `generateViewport()`가 쿠키로 분기. manifest theme_color는 정적 유지 |
| E8 | `/me` 로그아웃 제거로 사용자 혼란 | 헤더 톱니 → "설정" 멘탈 모델로 충분. 추가 안내 없음 (YAGNI) |

---

## 5. 테스트 계획

### 5-1. 단위 테스트 (신규 1 파일)
**`src/lib/fortune/theme.test.ts`** — Vitest
- `readTheme()` 쿠키 없을 때 `'light'`
- `'dark'` → `'dark'`, `'light'` → `'light'`
- 깨진 값 (`'foo'`, `''`, `'DARK'`) → `'light'` 폴백
- `next/headers`의 `cookies` mock 사용

`setTheme(next)`은 사이드 이펙트(`cookies().set`, `revalidatePath`) 위주라 mock 비용이 ROI 대비 높음 → **스킵**.

### 5-2. 컴포넌트 테스트
**스킵**. `ThemeToggle`은 `useOptimistic` + server action이라 RTL 환경 구축 비용 vs 가치 미흡. 수동으로 검증.

### 5-3. 수동 검증 체크리스트
1. `npm run dev` → `/` 첫 방문, 라이트로 시작
2. 헤더 톱니 클릭 → `/settings`, "라이트" 활성
3. "다크" 클릭 → 즉시 다크. 새로고침 후에도 다크 유지
4. `/`, `/me`, `/history`, `/insights`, `/dream`에서도 다크 적용 (fortune-* 토큰 사용 영역)
5. 친구보기 / 이력 / 인사이트 카드 파스텔이 다크에서도 그대로 (Out of Scope 의도) 확인
6. `/settings` 로그아웃 클릭 → `/login` 리다이렉트
7. `/me`에 로그아웃 버튼 사라졌는지 확인
8. DevTools Application → Cookies에 `theme=dark|light` (httpOnly, lax, max-age 1y) 확인
9. PWA 설치 후 status bar 색이 라이트(흰)/다크(어둠) 분기 확인

### 5-4. 회귀 방지
- 기존 27 단위 테스트 통과 유지 (변경 없음).
- `npm run build` 1회 → TypeScript / Next 16 빌드 통과.

---

## 6. 위험 & 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| `revalidatePath('/', 'layout')`이 운세 AI 재호출 트리거 | 비용 증가 | 현재 운세 server action은 DB 캐시 우선 → 영향 없음. 비용 모니터링은 별도 "운세 비용" 트랙에서 |
| 인라인 hex 카드의 라이트 색이 다크에서 어색 | 사용자 인지 | Out of Scope로 명시. 향후 풀 다크 단계에서 토큰화 |
| 토글 직후 짧은 RSC 리렌더 지연 (수십~수백 ms) | UX | `useOptimistic`로 시각 변화는 즉시. 실제 DOM 토글은 그 다음 tick |
| `httpOnly` 쿠키라 클라이언트 JS가 쿠키 직접 못 읽음 | 잠재 혼란 | UI는 항상 server-side `initial` prop으로 시드. 클라이언트는 DOM `.dark` 클래스만 신뢰 |

---

## 7. 마일스톤 (구현 계획용 메모)

이 디자인 문서는 다음 단계인 `writing-plans`에서 task-level 분해의 입력. 대략 다음 순서:
1. `theme.ts` + 단위 테스트
2. `setTheme` action
3. `globals.css` 다크 토큰
4. `RootLayout` (`readTheme`, `generateViewport`, `<html>` 클래스)
5. `AppHeader` Settings 아이콘
6. `ThemeToggle` 컴포넌트
7. `/settings/page.tsx`
8. `/me/page.tsx` 로그아웃 제거
9. 수동 검증 체크리스트 통과
