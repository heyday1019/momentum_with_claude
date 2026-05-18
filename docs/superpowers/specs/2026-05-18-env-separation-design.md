# 운영/개발 환경 분리 — Design Spec

- **Date**: 2026-05-18
- **Status**: Draft (awaiting user review)
- **Topic**: dev / production 환경 분리, develop 브랜치 도입, CI 게이트, 데이터/마이그레이션 안전 절차

---

## 1. Overview

운영 도메인에 머지된 코드가 즉시 사용자에게 노출되는 현재 구조에서, **충분한 통합 검증을 거친 코드만 운영에 배포**되도록 단일 게이트가 있는 운영/개발 분리 환경을 도입한다.

### Goals
- `master`(운영) / `develop`(영속 스테이징) 두 브랜치 운용
- Vercel Custom Environment `development` 도입, 운영과 동일한 외부 의존성 토폴로지로 동작
- Supabase는 **별도 프로젝트**로 완전 격리. 운영 사용자 데이터를 개발 작업이 건드릴 수 없음
- 모든 master 머지는 PR + CI 통과를 강제 (GitHub branch protection)
- 마이그레이션은 **forward-only**, dev에 먼저 apply 후 master 머지 시 prod 적용

### Non-goals
- 별도 Vercel 프로젝트 분리 (단일 프로젝트의 Custom Environment로 충분)
- 별도 Google/Kakao OAuth 앱 생성 (단일 앱에 redirect URI 다중 등록)
- 별도 OpenRouter API 키 (공유 + dev mock 우선 정책)
- Feature flag 시스템 도입
- E2E(Playwright 등) 자동화 (이번 범위 밖)

---

## 2. Architecture — 브랜치·환경 토폴로지

### 브랜치 구조

| 브랜치 | 역할 | 보호 | Vercel 환경 |
|---|---|---|---|
| `master` | 운영 (Production) | branch protection (PR 강제 + CI 통과 + 직접 push 금지 + force push 차단) | Production |
| `develop` | 스테이징 (영속) | branch protection (동일 규칙) | Custom Env `development` |
| `feature/<topic>` | 작업 (임시, 머지 후 삭제) | 없음 | 자동 Preview |
| `fix/<topic>` | 핫픽스 (임시) | 없음 | 자동 Preview |

### 환경별 도메인

| 환경 | 도메인 |
|---|---|
| **Production** | `momentum-with-claude.vercel.app` (기존 그대로) |
| **Development** | `development-momentum-with-claude.vercel.app` (Vercel Custom Env, alias 신규) |
| **Preview** | Vercel 자동 생성 `momentum-with-claude-git-<branch>-…vercel.app` |

### Golden Path (정상 작업 흐름)

```
1. develop에서 feature 브랜치 컷
   git checkout develop && git pull
   git checkout -b feature/<topic>

2. 작업 + 푸시 → Vercel Preview URL로 1차 확인
   git push -u origin feature/<topic>

3. develop으로 PR (CI 자동: test + build + typecheck + lint)
   CI 통과 후 머지 → development-momentum-with-claude.vercel.app 자동 배포

4. development 환경에서 통합 테스트
   - 운세/타로/꿈/로또 핵심 플로우
   - Polar sandbox 결제 시뮬레이션
   - 마이그레이션 있으면 SELECT로 동작 확인

5. develop → master PR (CI 재실행)
   머지 → momentum-with-claude.vercel.app 자동 배포

6. 운영 smoke check (자동 GitHub Action — 섹션 5 참고)
```

### 핫픽스 예외

운영 긴급 fix는 `master`에서 직접 `fix/<topic>` 컷 → master PR → 머지 후 즉시 develop으로 백포트 PR. develop을 거치지 않는 유일한 예외이며 **"운영 다운" 같은 명확한 사유에만** 허용.

---

## 3. External Services — 매핑

### 3.1 Supabase

| 항목 | Production | Development |
|---|---|---|
| 프로젝트 | 기존 (운영) | **신규 생성** (예: `momentum-dev`) |
| URL / Anon Key / Service Role Key | 기존 | 신규 발급 |
| 마이그레이션 | develop 검증 통과 후 master 머지 시 적용 | PR이 develop에 머지될 때 먼저 적용 |
| 시드 데이터 | 없음 (운영 사용자만) | 테스트 계정 시드 (`supabase/seed/dev.sql`) |
| RLS | 동일 | 동일 |

**마이그레이션 동기화 원칙**: `supabase/migrations/*.sql` 1개 = 진실의 원천. develop에 먼저 apply → 검증 → master 머지 후 운영에 apply. apply 도구는 Supabase MCP `apply_migration`.

### 3.2 Polar (결제)

| 항목 | Production | Development |
|---|---|---|
| `POLAR_ENV` | `production` | `sandbox` |
| `POLAR_ORG_TOKEN` | prod 토큰 | sandbox 토큰 |
| `POLAR_PRODUCT_SMALL/MEDIUM/LARGE` | prod product IDs | sandbox product IDs (3개 신규 생성) |
| `POLAR_WEBHOOK_SECRET` | prod webhook secret | sandbox webhook secret |
| Webhook endpoint (Polar 측 등록) | `https://momentum-with-claude.vercel.app/api/polar/webhook` | `https://development-momentum-with-claude.vercel.app/api/polar/webhook` |

코드는 이미 `POLAR_ENV` 분기 지원. 환경변수 값만 환경별로 셋팅하면 동작.

### 3.3 OpenRouter (AI)

| 항목 | Production | Development |
|---|---|---|
| `OPENROUTER_API_KEY` | 공유 (단일 키, $20/월 한도) | 공유 (동일 키) |
| 호출 정책 | 실제 API | **mock 우선** (`__mocks__/client.ts`) |
| 분리 플래그 | – | `USE_OPENROUTER_MOCK=true` 기본값 |

**이유**: 키 분리 비용 대비 효익 작음. dev 일상 테스트는 결정론적 mock으로 비용 0. 실제 호출 필요 시 변수만 일시 토글.

### 3.4 OAuth (Google · Kakao)

| 항목 | 정책 |
|---|---|
| Google Cloud OAuth Client | **기존 앱에 redirect URI 추가**: `https://<dev-supabase-ref>.supabase.co/auth/v1/callback` |
| Kakao Developers | **기존 앱에 redirect URI 추가**: 동일 |
| Supabase Auth → Providers | dev Supabase 프로젝트에서 동일 Client ID/Secret로 활성화 |
| 앱 callback (Vercel 측) | `https://development-momentum-with-claude.vercel.app/auth/callback` 추가 등록 |

**이유**: 단일 앱에 redirect URI 다중 등록이 표준 패턴. 별도 OAuth 앱 생성은 콘솔 작업 두 배.

### 3.5 환경변수 매트릭스

| 변수 | Production | Development |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod URL | **dev URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | **dev** |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | **dev** |
| `NEXT_PUBLIC_SITE_URL` | `https://momentum-with-claude.vercel.app` | `https://development-momentum-with-claude.vercel.app` |
| `OPENROUTER_API_KEY` | shared | shared |
| `USE_OPENROUTER_MOCK` | (unset) | `true` |
| `POLAR_ENV` | `production` | `sandbox` |
| `POLAR_ORG_TOKEN` | prod | sandbox |
| `POLAR_WEBHOOK_SECRET` | prod | sandbox |
| `POLAR_PRODUCT_*` | prod IDs | sandbox IDs |
| `ADMIN_EMAILS` | prod 관리자 | 본인 이메일만 |

Vercel 환경변수 Scope 분류:
- **Production** 만 체크: prod Supabase 키, prod Polar 키
- **Development** 만 체크: dev Supabase 키, sandbox Polar 키, `USE_OPENROUTER_MOCK=true`
- **모든 환경**: `OPENROUTER_API_KEY`
- **Preview** : dev와 동일값 매핑 (feature 브랜치 검증용)

---

## 4. Data & Migrations

### 4.1 적용 시퀀스 (Forward-only)

```
[feature 브랜치]
   │ supabase/migrations/YYYYMMDDHHMMSS_<name>.sql 작성
   │ 로컬에서 SQL 직접 검토
   ▼
[develop PR 머지 직후]
   │ Supabase MCP: apply_migration(project=dev, name, query)
   │ dev SQL Editor로 SELECT 확인 → 자동 배포된 코드 동작 확인
   ▼
[develop 검증 통과 후 master PR]
   │ CI 통과 + 코드 리뷰
   ▼
[master 머지 직후]
   │ Supabase MCP: apply_migration(project=prod, name, query)
   │ 운영 SELECT 즉시 확인
```

**원칙**: 마이그레이션 SQL과 코드는 같은 PR로 묶이지만, **DB 적용은 코드 배포 자동화와 별도의 수동 단계**로 유지.

### 4.2 Destructive Change 가이드 (3-phase)

| 변경 유형 | 처리 |
|---|---|
| 컬럼 추가 (nullable) | 즉시 OK, 단일 마이그레이션 |
| NOT NULL 컬럼 추가 | (1) nullable + DEFAULT로 추가, (2) backfill, (3) 다음 마이그레이션에서 NOT NULL |
| 컬럼 제거 | (1) 코드에서 컬럼 미사용 처리 → 배포, (2) 다음 배포에서 DROP COLUMN |
| 테이블 제거 | (1) 미사용 처리 후 1주 관찰, (2) DROP TABLE |
| 인덱스 추가 (대용량) | `CREATE INDEX CONCURRENTLY` (트랜잭션 밖) |
| RLS 정책 변경 | dev에서 정책 위반 케이스 SELECT로 검증 후 prod 적용 |

### 4.3 시드 데이터

신규 파일: `supabase/seed/dev.sql` — dev Supabase 초기 셋업 시 1회 수동 apply.

```sql
-- 테스트용 프로필 (실제 OAuth 가입 후 profile만 fill)
-- 운영용 데이터 절대 복제하지 않음 — 개인정보 격리 원칙
insert into profiles (id, full_name, birth_date, gender) values
  ('<dev-test-user-uuid>', '테스트유저', '1990-01-01', 'unspecified');

-- 잔액 부여
insert into credits_ledger (user_id, delta, reason) values
  ('<dev-test-user-uuid>', 50, 'dev-seed');
```

**운영 DB 데이터는 절대 dev로 복제하지 않음** (PII 격리 원칙).

### 4.4 롤백 전략

| 상황 | 액션 |
|---|---|
| 운영 코드만 깨짐 (DB 무관) | Vercel 대시보드 → 이전 deployment "Instant Rollback" |
| 운영 코드 + DB 변경이 함께 깨짐 | (1) Vercel rollback, (2) DB는 forward-fix 마이그레이션 작성 |
| 마이그레이션 prod에서만 실패 | dev에 동일 환경 재현 → fix → 새 마이그레이션으로 forward |
| RLS 변경 사고 | 정책을 이전 상태로 되돌리는 별도 forward 마이그레이션 발행 |

**down 마이그레이션은 작성하지 않음** — 자료 손실 위험. 모든 수정은 forward.

### 4.5 데이터 손실 보호

- **백업**: 운영 Supabase는 Pro 플랜 PITR 사용 권장 (이번 범위 밖, 별도 작업)
- **민감 RLS 변경**은 항상 단일 마이그레이션으로 분리 (1 PR = 1 RLS change)
- `service_role_key`는 Vercel 환경변수에만, git 커밋 금지 (`.env.local`은 이미 `.gitignore`)

---

## 5. CI/CD + Branch Protection

### 5.1 CI 워크플로우

신규 파일: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [master, develop]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
          SUPABASE_SERVICE_ROLE_KEY: placeholder
          NEXT_PUBLIC_SITE_URL: https://placeholder.vercel.app
          OPENROUTER_API_KEY: placeholder
          POLAR_ENV: sandbox
          POLAR_ORG_TOKEN: placeholder
          POLAR_WEBHOOK_SECRET: whsec_placeholder
          POLAR_PRODUCT_SMALL: placeholder
          POLAR_PRODUCT_MEDIUM: placeholder
          POLAR_PRODUCT_LARGE: placeholder
          ADMIN_EMAILS: placeholder@example.com
```

**왜 빌드까지?** `tsc` 만으로는 Next.js metadata 라우트(`opengraph-image.tsx`, `robots.ts`, `sitemap.ts`) 빌드 에러를 잡지 못함.

### 5.2 GitHub Branch Protection

| 브랜치 | 규칙 |
|---|---|
| `master` | • Require PR before merging<br>• Require status checks to pass: `verify`<br>• Require branches up to date before merging<br>• Block force push<br>• Block direct push |
| `develop` | • 동일 규칙 (force push 차단, 직접 push 금지, CI 통과 필수) |

설정 위치: GitHub Repo → Settings → Branches → Add classic branch protection rule.

### 5.3 PR 템플릿

신규 파일: `.github/pull_request_template.md`

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

### 5.4 운영 배포 Smoke Check

신규 파일: `.github/workflows/smoke.yml`

```yaml
name: Production Smoke
on:
  workflow_dispatch:
  push:
    branches: [master]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel deploy
        run: sleep 90
      - name: 4 landings 200
        run: |
          for p in /fortune /tarot /dream /lotto; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            [ "$code" = "200" ] || { echo "FAIL $p $code"; exit 1; }
          done
      - name: SEO assets
        run: |
          for p in /robots.txt /sitemap.xml /llms.txt /opengraph-image; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            [ "$code" = "200" ] || { echo "FAIL $p $code"; exit 1; }
          done
      - name: Protected child routes 307
        run: |
          for p in /tarot/result /dream/journal /billing; do
            code=$(curl -s -o /dev/null -w "%{http_code}" "https://momentum-with-claude.vercel.app$p")
            [ "$code" = "307" ] || { echo "FAIL $p expected 307 got $code"; exit 1; }
          done
```

실패 시 GitHub Actions 알림 → Vercel Instant Rollback 판단 가능.

---

## 6. Setup Checklist (1회 작업)

구현 단계에서 task로 분해된다.

1. Supabase: 신규 `momentum-dev` 프로젝트 생성 → URL/keys 발급
2. Supabase: 기존 마이그레이션 26+개를 dev 프로젝트에 순서대로 apply
3. Supabase: dev에 Auth Providers (Google/Kakao) 활성화
4. Google Cloud: OAuth Client redirect URI에 dev Supabase callback 추가
5. Kakao Developers: 동일 추가
6. Polar Sandbox: dev용 3개 product 생성 + webhook endpoint(dev 도메인) 등록 + secret 발급
7. Vercel: Custom Environment `development` 생성 + 도메인 alias 셋업
8. Vercel: 환경별 환경변수 셋업 (3.5 매트릭스)
9. Git: `develop` 브랜치 생성 + origin push
10. GitHub: master, develop branch protection 활성화
11. `.github/workflows/ci.yml` + `.github/workflows/smoke.yml` + `.github/pull_request_template.md` 추가
12. `supabase/seed/dev.sql` 작성 + dev에 apply

---

## 7. Out of Scope (이번 spec 밖)

- Supabase Pro PITR 백업 (별도 결정 사항)
- Playwright/E2E 테스트 자동화
- Feature flag 시스템
- 별도 OpenRouter 키 분리 (현재 mock 우선 정책으로 충분)
- 도메인 자체 변경 (커스텀 도메인 — H7, 사용자 메모상 후순위)
- Production 데이터 마스킹해 dev로 가져오는 도구

---

## 8. Open Questions

(없음 — 4개 핵심 결정사항 모두 사용자 승인 완료)

---

## 9. References

- 기존 Spec: `docs/superpowers/specs/2026-05-02-fortune-service-phase1-design.md`
- 기존 Plan: `docs/superpowers/plans/2026-05-16-polar-test-payment.md`
- 사용자 메모: `~/.claude/projects/.../memory/reference_vercel_preview_protection.md`
- CLAUDE.md 커밋·푸시 규칙
- AGENTS.md (Next.js 16 컨벤션)
