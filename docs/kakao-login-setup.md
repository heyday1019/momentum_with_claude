# 카카오 SNS 로그인 설정 가이드

코드는 이미 구현돼 있다 (`src/components/fortune/auth-button.tsx` →
Supabase `signInWithOAuth({ provider: 'kakao' })`).
나머지는 외부 콘솔(카카오 개발자 + Supabase Dashboard) 설정 작업이다.

소요 시간: 약 15–20분.

준비물:
- 카카오 계정 (개인용 OK)
- 사업자 등록 없이도 무료 발급 가능. 실서비스 신청은 따로지만 본인 인증 + 일반 사용자 100명까지는 별도 심사 없이 동작한다.
- Supabase 프로젝트 owner/admin 권한
- 로컬 dev URL: `http://localhost:3000`
- 배포 URL (Vercel): `https://<your-project>.vercel.app` ← **네 값으로 교체**

---

## 1. Supabase 프로젝트 ref 확인

먼저 Supabase 콜백 URL을 만들 때 필요하다.

1. https://supabase.com/dashboard 에서 프로젝트 진입
2. Settings → General → **Reference ID** 복사 (예: `abcdwxyz1234`)
3. 이걸로 만든 콜백 URL이 두 콘솔(카카오, Supabase) 양쪽에 들어가야 한다:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

   이 URL은 **카카오 → Supabase**의 토큰 교환 경로다. 우리 앱 도메인이 아니라
   Supabase 도메인이라는 점이 자주 헷갈린다.

---

## 2. 카카오 Developers 앱 만들기

### 2-1. 앱 생성
1. https://developers.kakao.com/console/app 접속 → 카카오 계정 로그인
2. **애플리케이션 추가하기**
   - 앱 아이콘: 임시 PNG (나중에 변경 가능)
   - 앱 이름: `Momentum` (사용자에게 동의 화면에서 표시됨)
   - 사업자명: 본인 이름 OK (개인 개발자)
   - 카테고리: 적당히 (예: 라이프스타일)
3. 생성되면 **앱 키** 메뉴로 이동:
   - **REST API 키** 복사 → 이게 OAuth Client ID 역할 (예: `8a1b2c3...`)

### 2-2. 카카오 로그인 활성화
1. 좌측 메뉴: **제품 설정 → 카카오 로그인**
2. **활성화 설정 ON**
3. **OpenID Connect 활성화 ON** (Supabase가 OIDC를 사용)
4. **Redirect URI 등록**에서 **딱 1개 추가**:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

   ⚠️ 우리 앱 URL(`localhost:3000/auth/callback` 또는 `vercel.app/auth/callback`)을
   여기 넣지 않는다. 카카오는 Supabase로만 리다이렉트하고, 그 다음 Supabase가
   우리 앱으로 보내는 구조다.

### 2-3. Client Secret 발급
1. **제품 설정 → 카카오 로그인 → 보안**
2. **Client Secret** 코드 생성 → 활성화 상태 사용
3. 생성된 시크릿 값 복사 (예: `xY9pQ...`)

### 2-4. 동의 항목 설정
1. **제품 설정 → 카카오 로그인 → 동의 항목**
2. 다음 항목을 추가/필수로 지정:
   - **닉네임** (`profile_nickname`) → 필수
   - **카카오계정(이메일)** (`account_email`) → 필수
3. **OpenID Connect** 항목이 보이면:
   - `openid` → 필수

   ⚠️ 이메일은 카카오 비즈 앱이 아니면 **선택 동의로만** 받을 수 있는 경우가 있다.
   비즈 전환 없이 진행 시: 이메일 항목을 "선택 동의"로 두고, 사용자가 거부하면
   `profile.email`이 비어 들어온다는 점만 알아두면 된다.

### 2-5. 테스트 사용자 등록 (검수 전 단계)
1. **앱 설정 → 팀 관리 또는 일반** 페이지에서 **테스트 사용자**로 본인 카카오 계정 추가
2. 검수 통과 전에는 이 목록에 있는 계정만 로그인 가능 (최대 100명)

---

## 3. Supabase Dashboard에서 카카오 Provider 켜기

1. https://supabase.com/dashboard → 프로젝트 → **Authentication → Providers**
2. 목록에서 **Kakao** 찾아 클릭 → **Enable Kakao** 토글 ON
3. 입력란:
   - **Client ID (REST API 키)**: 2-1에서 복사한 REST API 키
   - **Client Secret**: 2-3에서 만든 Client Secret
4. **Callback URL (for OAuth)**에 `https://<ref>.supabase.co/auth/v1/callback`이
   미리 적혀 있을 것이다. 그대로 사용 — 이걸 카카오 콘솔에 등록하면 된다 (위 2-2).
5. Save.

---

## 4. Supabase 리다이렉트 URL 화이트리스트 추가

이게 빠지면 로그인은 되지만 우리 앱으로 돌아오지 못해 빈 화면이 뜬다.

1. **Authentication → URL Configuration**
2. **Site URL**: 기본 배포 URL (예: `https://<your-project>.vercel.app`)
3. **Redirect URLs**에 아래 모두 추가:

   ```
   http://localhost:3000/auth/callback
   https://<your-project>.vercel.app/auth/callback
   ```

   PR 미리보기 URL도 사용한다면 와일드카드 형태로:

   ```
   https://<your-project>-*.vercel.app/auth/callback
   ```

4. Save.

---

## 5. 동작 검증

### 로컬
```powershell
npm run dev
```
- http://localhost:3000/login 접속
- "카카오로 계속하기" 클릭
- 카카오 로그인 화면 → 동의 화면 → 우리 앱으로 복귀
- `/` 홈에서 로그인된 상태 (헤더 우측 사용자 표시)
- Supabase Dashboard → Authentication → Users에 새 row 생성 확인

### 배포 (Vercel)
- https://<your-project>.vercel.app/login 에서 동일 흐름 확인
- 만약 redirect_uri mismatch 에러: 카카오 콘솔의 Redirect URI가
  `https://<ref>.supabase.co/auth/v1/callback`과 정확히 일치하는지 재확인

---

## 자주 나오는 오류

| 증상 | 원인 / 해결 |
|---|---|
| `KOE006 redirect_uri mismatch` | 카카오 콘솔의 Redirect URI ≠ Supabase 콜백 URL. 2-2에서 등록한 값을 정확히 확인 |
| 로그인 후 빈 화면 / `?error_description=...` | Supabase URL Configuration의 Redirect URLs에 우리 앱 콜백이 누락. 4단계 재확인 |
| 동의 화면에 "이메일" 항목이 안 뜸 | 2-4 동의 항목에서 `account_email` 필수/선택 설정 확인 |
| `provider is not enabled` | Supabase Dashboard에서 Kakao Provider 토글이 꺼져 있음 (3단계) |
| 테스트 사용자만 들어오고 다른 사람은 401 | 검수 전 단계라 정상. Kakao Developers에서 검수 신청 필요 |

---

## 코드는 어디에?

- 버튼 트리거: `src/components/fortune/auth-button.tsx` (`KakaoButton`)
- 콜백 처리: `src/app/auth/callback/route.ts` (Supabase가 토큰 교환 후 우리 앱으로 리다이렉트)
- Supabase 클라이언트: `src/lib/supabase/{client,server}.ts`

이미 동작하는 코드이므로 외부 설정만 위 5단계대로 마치면 된다.
