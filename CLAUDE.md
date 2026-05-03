@AGENTS.md
@DESIGN.md

## Design

UI 디자인 작업 시 반드시 `DESIGN.md`를 먼저 참고한다. 컴포넌트 스타일, 레이아웃, 톤앤매너에 대한 결정은 `DESIGN.md`의 가이드를 따른다.

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
