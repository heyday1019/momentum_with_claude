# 운세 서비스 — Phase 1 (Foundation) 설계 명세

**작성일**: 2026-05-02
**범위**: Phase 1 (Foundation) — Light-First MVP. 5단계 분해의 1단계.

---

## 1. 프로젝트 개요 & 범위

### 무엇을 만드나
Meta 디자인 시스템 톤(`DESIGN.md`)을 따르는 모바일 우선 운세 서비스. 로그인 후 홈 피드에서 "오늘의 운세 / 띠·별자리 / 행운의 로또번호" 3종을 한 눈에 받는다.

### 5단계 분해 (전체 로드맵)

| Phase | 범위 |
|---|---|
| **1. Foundation (이 문서)** | Auth + 온보딩 + 마이페이지 + 홈 피드(오늘의 운세·띠/별자리·로또) + 라이트 테마 + 한국어 + 일일 1회 캐시 |
| 2. 사주 | 시간/윤달/양력 입력 + 명리 깊은 해석 + 홈 피드 카드 추가 |
| 3. 타로 | 카드 셔플 인터랙션 + 스프레드 + 78장 자산 + 카드별 해석 |
| 4. 공유 & 푸시 | 결과 이미지 카드 + 카카오 SDK + 공개 결과 페이지 + 웹푸시 |
| 5. 다크 & 다국어 | dark token 정의 + 다크 컴포넌트 + 한/영 i18n |

각 Phase는 별도 brainstorming → spec → plan → 구현 사이클.

> Pencil 디자인 단계에서는 Phase 2~5의 핵심 화면도 목업 수준으로 함께 그려 시각 일관성을 잡는다.

### Phase 1 MVP 스코프
- 인증: Google OAuth + Kakao OAuth + 이메일 매직링크
- 온보딩 1회 (이름·생년월일·성별)
- 홈 피드 단일 화면 (3개 운세 카드 세로 스택)
- 카드 인라인 아코디언 펼침 (별도 결과 라우트 없음)
- "다른 사람 정보로 보기" 일회성 입력 토글 (저장 X)
- 마이페이지 (프로필 수정 + 로그아웃)
- 일일 1회 + 24시간 캐시 (오늘의 운세·띠/별자리: 자정 갱신 KST / 로또: 회차 단위)
- AI 톤: 친근한 멘토 (존댓말, 일상어)
- 모바일 라이트 테마 우선, 한국어 전용

### Phase 1 Out-of-Scope
사주, 타로, 공유, 푸시, 다크모드, 영어, 멀티 프로필, 운세 히스토리 페이지.

### 기술 스택
- **프론트엔드**: Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui, lucide-react
- **인증·DB**: Supabase (project_ref `beoxgpnczelauiovhxxz`)
- **AI**: OpenRouter (`anthropic/claude-haiku-4-5`)
- **디자인 도구**: Pencil MCP — 모바일 화면 목업
- **배포**: Vercel (Fluid Compute 기본)

### 성공 기준
1. 신규 사용자가 로그인 → 온보딩 → 첫 운세 결과까지 3분 이내.
2. 같은 날 재방문 시 캐시된 결과가 즉시(<200ms) 표시 (AI 재호출 X).
3. AI 결과가 친근한 멘토 톤을 일관되게 유지.
4. 모바일(360–480px)에서 텍스트 잘림 없음, 터치 타겟 ≥ 40×40px.

---

## 2. 아키텍처

### 시스템 흐름

```
[Mobile Browser]
      │ /login → OAuth or 매직링크
      ▼
[Next.js App Router on Vercel (Fluid Compute)]
      │
      ├── Server Actions / Route Handlers
      │       ├── Supabase Auth (세션, JWT)
      │       ├── Supabase DB (RLS)
      │       └── OpenRouter (claude-haiku-4-5)
      └── Client Components (홈 피드, 카드, 토글)
```

### "오늘의 운세" 첫 진입 시퀀스
1. 클라이언트 → Server Component fetch
2. 세션 + `profiles` 조회
3. `fortune_daily (user_id, date=오늘 KST, type='daily')` 캐시 hit?
   - 있으면 캐시 반환
   - 없으면 OpenRouter 호출 → JSON 파싱 → INSERT → 반환

### 레이어

| 레이어 | 책임 | 위치 |
|---|---|---|
| UI 컴포넌트 | DESIGN.md 매핑, 입력, 로딩/에러 | `src/components/` |
| 데이터 페칭 | Server Components + Server Actions | `src/app/**/page.tsx`, `src/app/actions/` |
| 도메인 로직 | 프롬프트 빌더, 로또 시드, KST 자정 계산 | `src/lib/fortune/` |
| 외부 통합 | Supabase 클라이언트, OpenRouter fetch 래퍼 | `src/lib/supabase/`, `src/lib/openrouter/` |

### 보안 경계
- `OPENROUTER_API_KEY`: 서버 전용 환경변수. 모든 AI 호출은 Server Action / Route Handler 안에서.
- Supabase RLS 정책으로 `auth.uid() = user_id`만 행 접근.
- "다른 사람 보기"는 DB 미저장 + 캐시 우회 + Server Action 직접 호출.

### 외부 의존성 (사전 작업 필요)
- 카카오 개발자 콘솔: OAuth 앱 등록
- Google Cloud Console: OAuth 앱 등록
- Supabase: provider 연결 + RLS 정책 적용

---

## 3. 화면 흐름 & IA

### 화면 맵

```
[/login] ──인증──▶ ┌─프로필 없음─▶ [/onboarding] ─▶ [/]
                 └─프로필 있음─▶ [/]

[/]  홈 피드 (3 카드 세로 스택)
  ├─ 카드 탭 → 인라인 아코디언 펼침
  └─ 헤더 마이 아이콘 → [/me]

[/me] 프로필 수정 + 로그아웃
```

### 라우트

| # | 라우트 | 목적 |
|---|---|---|
| 1 | `/login` | 미인증 진입, OAuth/매직링크 선택 |
| 2 | `/login/email` | 매직링크용 이메일 입력 |
| 3 | `/auth/callback` | OAuth/매직링크 콜백 처리 (UI 없음) |
| 4 | `/onboarding` | 신규 사용자 프로필 입력 |
| 5 | `/` | 홈 피드 (3개 운세 카드) |
| 6 | `/me` | 마이페이지 |

> 결과 상세는 별도 라우트 대신 홈 피드 인라인 아코디언으로 구현 — 모바일 페이지 이동 마찰 감소 + 일일 캐시와 정합.

### 인터랙션 디테일
- 카드 펼침/접힘: 300ms ease-in-out. 동시 다중 펼침 허용.
- "다른 사람 보기" 토글: 카드 우상단 텍스트 링크 → 펼치면 카드 안쪽 상단에 일회성 입력 박스 (`{colors.surface-soft}`) → "이 정보로 보기"는 캐시 우회 새 호출.
- 로딩: 카드 본문 자리 스켈레톤 (3줄 막대, 1.5s 펄스).
- 에러: 카드 본문에 `badge-critical` + 재시도 버튼.

---

## 4. DB 스키마 (Supabase)

### `profiles`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE |
| `name` | `text` | NOT NULL, length ≤ 30 |
| `birthdate` | `date` | NOT NULL |
| `gender` | `text` | NOT NULL, CHECK IN ('male','female','other') |
| `created_at` | `timestamptz` | DEFAULT `now()` |
| `updated_at` | `timestamptz` | DEFAULT `now()` |

### `fortune_daily`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | `bigint` | PK identity |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` CASCADE |
| `date` | `date` | NOT NULL (KST) |
| `fortune_type` | `text` | NOT NULL, CHECK IN ('daily','zodiac') |
| `content` | `jsonb` | NOT NULL |
| `model` | `text` | NOT NULL DEFAULT `'anthropic/claude-haiku-4-5'` |
| `created_at` | `timestamptz` | DEFAULT `now()` |
| UNIQUE | | `(user_id, date, fortune_type)` |

`'daily'` = 종합 오늘의 운세, `'zodiac'` = 띠 + 별자리 묶음.

### `lotto_recommendations`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | `bigint` | PK identity |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` CASCADE |
| `draw_number` | `integer` | NOT NULL |
| `numbers` | `integer[]` | NOT NULL, 6개, 1~45 unique |
| `comment` | `text` | NOT NULL |
| `created_at` | `timestamptz` | DEFAULT `now()` |
| UNIQUE | | `(user_id, draw_number)` |

### RLS 정책 (모든 테이블 RLS ENABLED)

```sql
CREATE POLICY "profiles_owner_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_owner_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_owner_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "fortune_daily_owner_select" ON fortune_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fortune_daily_owner_insert" ON fortune_daily FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lotto_owner_select" ON lotto_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lotto_owner_insert" ON lotto_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
```

UPDATE/DELETE 정책은 Phase 1에서 미생성 (수정/삭제 기능 없음 — RLS 기본 거부).

### 트리거
- `auth.users` insert 시 자동 `profiles` 생성하지 **않음** — 온보딩 화면에서 사용자 입력 후 직접 INSERT.
- `update_updated_at_column()` 트리거를 `profiles.updated_at`에 적용.

### "다른 사람 보기" 처리
- DB 미저장.
- Server Action에 `viewerProfile?: { name, birthdate, gender }` 옵셔널 인자 추가.
- 인자 있으면 캐시 조회/저장 우회, OpenRouter 직접 호출.

### 마이그레이션
Supabase MCP `apply_migration` 도구로 timestamped 파일 생성. 예: `20260502120000_init_phase1.sql`.

---

## 5. OpenRouter 통합 & 프롬프트

### 클라이언트 설정
- `OPENROUTER_API_KEY` (서버 전용)
- 엔드포인트: `https://openrouter.ai/api/v1/chat/completions`
- 모델: `anthropic/claude-haiku-4-5`
- 헤더: `HTTP-Referer`, `X-Title: Momentum Fortune`
- `fetch` 래퍼 단일 모듈 (`src/lib/openrouter/client.ts`)

### 응답 포맷 (JSON 모드 강제)

```json
// daily
{
  "headline": "...",
  "body": "...",
  "lucky_keyword": "...",
  "categories": { "love": "...", "money": "...", "health": "...", "work": "..." }
}

// zodiac
{
  "headline": "...",
  "body": "...",
  "zodiac_animal": "...",
  "zodiac_sign": "...",
  "lucky_keyword": "..."
}

// lotto_comment
{ "comment": "..." }
```

### 시스템 프롬프트 (공통 톤)

```
당신은 한국어 운세 콘텐츠 작가입니다.

[톤]
- 친한 멘토처럼 따뜻하고 친근한 존댓말 ("~해요", "~네요").
- 한자어/명리 전문용어는 피하고 일상어로 풀어 씁니다.
- 단정적 예언 대신 "~수 있어요", "~좋아요" 같은 부드러운 권유.
- 문장은 짧고 호흡이 자연스럽게.
- 부정적 결과도 위협이 아닌 격려로 마무리.

[금지]
- 의학·법률·금융 단정.
- 특정 인물·사건·정치·종교 언급.
- 영어/이모지/마크다운 (반환은 순수 한국어 평문 + JSON).

[출력]
- 반드시 지정된 JSON 스키마로만 응답.
- 어떤 필드도 비워두지 않음.
```

### 프롬프트 빌더

| 타입 | 입력 | 출력 |
|---|---|---|
| `daily` | name, birthdate, gender, today_kst | 종합 본문 + 4 카테고리 |
| `zodiac` | birthdate, today_kst, zodiac_animal(서버 계산), zodiac_sign(서버 계산) | 띠+별자리 결합 본문 |
| `lotto_comment` | name, draw_number, numbers, today_kst | 1~2문장 코멘트 |

띠·별자리는 서버에서 birthdate로 결정적 계산 후 프롬프트 변수로 주입.

### 호출 정책

| 항목 | 값 |
|---|---|
| temperature | 0.7 (daily/zodiac), 0.5 (lotto_comment) |
| max_tokens | 800 / 500 / 200 |
| timeout | 15s |
| retry | JSON 파싱·네트워크 실패 시 1회 |
| 동시 호출 | 사용자당 타입별 직렬, 카드 3개는 병렬 |

### 로또 번호 생성 (AI 외부)

```
1. seed = sha256(user_id + draw_number)[:8] → uint64
2. seedrandom(seed) 인스턴스
3. [1..45]에서 6개 비복원 추출 → 정렬
4. lotto_recommendations.numbers 저장
5. OpenRouter로 코멘트만 생성 → comment 저장
```

같은 사용자 + 같은 회차 = 결정적 동일 번호 (캐시 사라져도 재현).

### 비용 예상
- daily: ~₩2~3
- zodiac: ~₩1.5~2
- lotto_comment: ~₩0.5~1
- 사용자당 일일 1세트 ≈ ₩4~6

---

## 6. 컴포넌트 매핑 (DESIGN.md → Phase 1)

### 공통 페이지 셸
- 배경 `{colors.canvas}`, 좌우 패딩 `{spacing.base}` (16px), 상하 `{spacing.xxl}` (32px)
- 모바일 헤더 60px, 좌측 워드마크, 우측 마이 아이콘 `button-icon-circular` 44×44
- 헤더 하단 `1px solid {colors.hairline-soft}`

### `/login`
- 풀-블리드 히어로 60vh, 하단 `{rounded.xxxl}`
- 헤드라인 `{typography.heading-lg}` 흰색 오버레이
- OAuth 버튼 ×2: `button-buy-cta` cobalt, width 100%
- 매직링크 진입: `button-secondary` 텍스트 링크
- **Cobalt 사용 정당화**: 인증은 commerce-like 결정 지점이라 cobalt 적합.

### `/login/email`
- 헤더 `{typography.heading-md}` 28px / 300
- 안내 `{typography.body-md}` `{colors.charcoal}`
- 이메일 `text-input` 44px, `text-input-focused` 활성
- 제출 `button-buy-cta` width 100%
- 발송 후 `badge-success` + "메일을 확인해주세요"

### `/onboarding`
- 헤드라인 `{typography.heading-lg}` "잠깐, 당신을 알려주세요"
- 이름 `text-input`
- 생년월일 `text-input` + native `<input type="date">`
- 성별 `radio-option` ×3 → 선택 `radio-option-selected` (cobalt 2px)
- 제출 `button-buy-cta` width 100%
- 그룹 간격 `{spacing.lg}` (20px)

### `/` 홈 피드 (핵심)
- 인사말 `{typography.heading-md}` 28px / 300 "{name}님, 오늘의 운세예요"
- 일자 캡션 `{typography.body-sm}` `{colors.steel}`
- 카드 ×3: `card-product-feature` 베이스, `{rounded.xxxl}`, `1px solid {colors.hairline-soft}`
- 카드 헤더: 타이틀 `{typography.heading-sm}` 24px / 500 + ▾ chevron
- 미리보기(접힘): 1줄 헤드라인 `{typography.subtitle-md}` + `lucky_keyword` `badge-promo-yellow`
- 펼친 본문: `{typography.body-md}`, 카테고리 4종 아이콘+1~2문장 row
- "다른 사람 보기" 토글: 카드 우상단 `{typography.body-sm-bold}` `{colors.steel}` 텍스트 링크
- 토글 펼친 입력: 카드 안쪽 `{colors.surface-soft}` 박스, `{rounded.lg}`, mini text-input ×3 + 작은 `button-buy-cta`
- 로또 번호: 6개 38×38 원형 칩, `{rounded.circle}`, 구간별 색상(warning/fb-blue/critical/charcoal/success), 숫자 `{typography.body-md-bold}` `{colors.canvas}`
- 카드 간격 `{spacing.lg}` 20px
- 스켈레톤: 3줄 막대 `{colors.surface-soft}` + `{rounded.lg}`, 1.5s 펄스

### `/me`
- 헤더 `{typography.heading-lg}` "내 정보"
- 프로필 폼: 온보딩과 동일 컴포넌트, prefilled
- 저장 `button-buy-cta`
- 구분선 `1px solid {colors.hairline-soft}` 상하 `{spacing.xxl}`
- 로그아웃 `button-ghost` 풀-너비, 텍스트 `{colors.critical}`
- 도움말 `{typography.body-sm}` `{colors.steel}` mailto
- 빌드 정보 `{typography.caption}` `{colors.stone}`

### 컴포넌트 분할 (shadcn/ui 베이스)

```
src/components/
├── ui/                    # shadcn 원본
│   ├── button.tsx
│   └── input.tsx
└── fortune/               # Phase 1 도메인
    ├── auth-button.tsx
    ├── fortune-card.tsx
    ├── fortune-card-daily.tsx
    ├── fortune-card-zodiac.tsx
    ├── fortune-card-lotto.tsx
    ├── viewer-toggle.tsx
    ├── profile-form.tsx
    └── lotto-number-chip.tsx
```

shadcn `Button` variant에 `buyCta`, `ghost`, `pillTabActive` 등 DESIGN.md 매핑 추가.

---

## 7. 에러·엣지·테스트

### 에러 처리
- 폼 검증 실패: `text-input-error` + `{colors.critical-strong}` 1줄 메시지
- 운세 API 실패: 카드 본문 `badge-critical` + "잠시 후 다시 시도해주세요" + 재시도 버튼
- 인증 실패: 페이지 상단 토스트 (`{colors.critical}`, 3초 자동 dismiss)
- 세션 만료: 미들웨어에서 `/login` redirect

### 엣지 케이스
- 자정 경계: 캐시 키는 `Asia/Seoul` 자정 기준 `date` (Vercel UTC → 명시 변환)
- 생년월일 1900년 이전·미래 차단
- 윤년 2/29: 양력 그대로 저장, 띠/별자리 룩업 정상
- OpenRouter rate limit (429): 1회 재시도 후 카드 에러
- 신규 사용자 온보딩 미완료로 `/` 진입 → 미들웨어 `/onboarding` redirect
- "다른 사람 보기" 입력 검증: 본인 폼과 동일 규칙

### 테스트
- 단위 (Vitest): 프롬프트 빌더, 띠·별자리 룩업, 로또 시드 결정성, KST 자정 계산
- E2E (Playwright, 후속): 인증 → 온보딩 → 홈 피드 / 360px viewport
- AI mock: `__mocks__/openrouter.ts`로 결정적 응답. 실제 호출 통합 테스트 1개만.

---

## 8. 사전 환경 작업 (구현 전 필요)

| 작업 | 책임 |
|---|---|
| Supabase 프로젝트 RLS 활성화 + 마이그레이션 적용 | Supabase MCP `apply_migration` |
| Google OAuth 앱 등록 (Cloud Console) | 사용자 |
| Kakao OAuth 앱 등록 (Kakao Developers) | 사용자 |
| Supabase Auth provider 연결 (client_id/secret) | 사용자 + Supabase 콘솔 |
| `OPENROUTER_API_KEY` Vercel env 등록 | 사용자 |
| OpenRouter 결제 수단 등록 + 사용 한도 설정 | 사용자 |
