# Momentum

매일의 운세 · 타로 · 꿈 해몽을 한국어로 보여주는 Next.js 16 앱. Supabase 기반 인증/스토리지 + OpenRouter를 통한 다중 AI 모델 (Claude / GPT / Gemini) 라우팅.

## 주요 기능

- **오늘의 운세** — 일일 / 띠·별자리 / 행운의 로또번호 (KST 기준 day key로 캐시)
- **친구 운세 보기** (`/lookup`) — 이름·생일·성별만 입력하면 익명 viewer 모드로 조회
- **타로** (`/tarot`) — 메이저 22장 + 마이너 56장 풀덱, 3장 스프레드 / 1장 데일리
- **꿈 해몽** (`/dream`) — 텍스트 입력 → GPT 도사 / Claude 점쟁이 / Gemini 선녀 중 1명 선택 → AI 풀이
  - 자동으로 `/dream/journal`에 보관 (삭제 가능)
- **회고** (`/history`) — 최근 30일 일자별 운세 모아보기
- **인사이트** (`/insights`) — 본인 사용 패턴 (키워드 TOP, 요일별 빈도, 페르소나 사용)
- **공유** — 모든 결과를 1080×1080 PNG로 — 모바일은 시스템 share sheet, 데스크톱은 클립보드 복사
- **계정 관리** (`/me`) — 프로필 편집, 데이터 내보내기 (JSON), 모든 데이터 삭제, 로그아웃
- **관리자 대시보드** (`/admin`) — `ADMIN_EMAILS`에 포함된 사용자만, 전체 사용자 활동 + 토큰 사용량 + 페르소나 선호도

## 기술 스택

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **Supabase** (Auth, Postgres, RLS)
- **OpenRouter** (Claude / GPT / Gemini 라우팅)
- **Tailwind CSS** + Pretendard 폰트 + DESIGN.md 토큰
- **next/og** + satori (소셜 공유 이미지)
- **vitest** (단위 테스트)

## 셋업

### 1. 사전 작업 (1회)

1. **Google Cloud Console**: OAuth Client 발급, redirect URI에 `https://<supabase-ref>.supabase.co/auth/v1/callback`
2. **Kakao Developers**: 앱 등록, "카카오 로그인" 활성, 동일 redirect 등록
3. **Supabase Dashboard**: Auth → Providers에서 Google + Kakao 활성, Site URL + Redirect URLs (`http://localhost:3000/auth/callback` + 배포 도메인) 등록
4. **OpenRouter**: 결제수단 + 월간 한도 설정 ($20 권장), API key 발급
5. (선택) **service_role key**: Supabase Settings → API에서 복사 — `/admin` 사용 시 필요

### 2. 환경 변수

`.env.example`을 `.env.local`로 복사 후 채움:

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (`/admin` 전용, 서버 노출 금지) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirect용 사이트 URL |
| `ADMIN_EMAILS` | 콤마 구분 admin 이메일 목록 — `/admin` 접근 권한 |

### 3. DB 마이그레이션

`supabase/migrations/` 의 SQL을 시간순으로 적용 (Supabase MCP `apply_migration` 또는 SQL Editor):

- `20260503000001_init_phase1.sql` — profiles, fortune_daily, lotto_recommendations
- `20260504000001_dream_ai_usage.sql` — 페르소나별 호출 카운트
- `20260504000002_dream_journal.sql` — 꿈 해몽 결과 보관
- `20260504000003_ai_call_log.sql` — 모든 AI 호출 토큰 로그

모든 테이블은 RLS owner-only. cross-user 조회는 service_role 키만.

### 4. 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 단위 테스트
```

## 프로젝트 구조

```
src/
├── app/
│   ├── (routes)/             # /, /login, /me, /lookup, /tarot, /dream, /history, /insights, /admin
│   ├── actions/              # Server Actions — fortune, tarot, dream, account, admin, …
│   └── api/og/               # 공유 OG 이미지 생성 (next/og)
├── components/
│   ├── fortune/              # 도메인 컴포넌트
│   └── ui/                   # 재사용 UI primitives (Button, Input)
└── lib/
    ├── fortune/              # 운세 도메인 로직 (KST, zodiac, lotto, prompts, validators)
    ├── tarot/                # 타로 데이터 + 추첨 + 직렬화
    ├── openrouter/           # AI 게이트웨이 클라이언트 + 토큰 로깅
    └── supabase/             # SSR + admin (service_role) 클라이언트

supabase/migrations/          # 시간순 SQL 마이그레이션 (소스 컨트롤 보존)
public/                       # 정적 자산 (캐릭터 이미지, 폰트 미러 등)
```

## 디자인 시스템

`DESIGN.md`에 토큰 + 컴포넌트 가이드. 색상은 `tailwind.config` 의 `fortune-*` 토큰 사용. 헤딩에는 Optimistic VF 대신 Pretendard (한국어). 백 버튼은 `BackButton` 공통 컴포넌트 (pill 형).

## 비자명한 결정들

- **Supabase eq-chain 회피**: `.select('jsonb_col').eq().eq().eq().maybeSingle()`이 row 미존재 반환하는 quirk가 있어, fortune cache 조회는 `.match({...}).limit(1)` + `data[0]` 패턴 통일 (cf. memory)
- **OpenRouter ```json 펜스 방어**: anthropic/claude-haiku 응답이 코드펜스로 감싸져 오는 케이스가 있어 `parseJsonLoose` 헬퍼로 펜스 strip 후 파싱
- **Next 16 proxy 컨벤션**: `middleware.ts` → `proxy.ts` (file convention)
- **타로 OG에서 transform 회피**: satori가 `transform: rotate(180deg)` 거부 — 역방향 카드는 점선 테두리 + chip 라벨로 표현
- **AI 호출 로깅의 결합 회피**: OpenRouter client는 Supabase에 직접 import하지 않고 `onUsage` 콜백으로 의존 주입

## 라이선스

Private project. Contact: [heyday1019@gmail.com](mailto:heyday1019@gmail.com)
