@AGENTS.md
@DESIGN.md

## Design

UI 디자인 작업 시 반드시 `DESIGN.md`를 먼저 참고한다. 컴포넌트 스타일, 레이아웃, 톤앤매너에 대한 결정은 `DESIGN.md`의 가이드를 따른다.

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

## Git 커밋 & Push 규칙

기능 개발이 완료될 때마다 다음 순서를 따른다.

1. 변경 파일 / diff 요약을 사용자에게 제시하고 **명시적 승인**을 받는다. 승인 없이는 `git commit`, `git push` 어느 것도 실행하지 않는다.
2. 승인 후 한 기능 = 한 커밋 단위로 `git commit` 작성. 메시지는 기존 컨벤션(`feat(scope): ...`, `fix(scope): ...` 등) 유지.
3. 커밋 직후 현재 브랜치를 origin에 `git push` 한다. push 결과(PR URL 등)는 사용자에게 보고한다.
4. force push, 브랜치 삭제, 훅 무시(`--no-verify`) 같은 파괴적 동작은 사용자가 명시적으로 요청한 경우에만 수행한다.

## Phase 1 환경 메모

- 로컬 dev: `.env.local`에 Supabase + OpenRouter 키 입력 후 `npm run dev`
- 단위 테스트: `npm test` (27 passed across 6 files: kst, zodiac, lotto, prompts, openrouter client, smoke)
- DB 마이그레이션: Supabase MCP `apply_migration`으로 적용. SQL 원본은 `supabase/migrations/` 보존.
- Next 16 라우팅 미들웨어는 `src/proxy.ts` (file convention `proxy`, function `proxy`). `src/lib/supabase/middleware.ts`는 helper로 이름 유지.
- AI 호출 mock: `src/lib/openrouter/__mocks__/client.ts` (테스트와 로컬 시연 시 사용)

### 사전 환경 작업 (Phase 1 가동 전 1회)
1. Google Cloud Console: OAuth Client 발급 + redirect URI에 `https://<supabase-ref>.supabase.co/auth/v1/callback`
2. Kakao Developers: 앱 등록, "카카오 로그인" 활성, 동일 redirect 등록, 동의항목 닉네임/이메일
3. Supabase Dashboard: Auth → Providers에서 Google + Kakao 활성, redirect URLs에 `http://localhost:3000/auth/callback` + 배포 도메인 추가
4. OpenRouter: 결제수단 등록 + 사용 한도 설정 (권장 $20/월) + API key 발급
5. `.env.local` 작성 (`.env.example` 템플릿 참고)
