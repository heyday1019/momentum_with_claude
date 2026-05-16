const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://momentum-with-claude.vercel.app";

const CONTENT = `# Momentum

> 매일 자정 새로 도착하는 한국형 AI 운세 서비스. 오늘의 운세, 타로 3장 리딩, 꿈 해몽, 로또 번호 추천을 친한 멘토 톤으로 전합니다.

## 핵심 기능
- **오늘의 운세**: 이름·생년월일 기반으로 매일 자정 갱신되는 개인화 운세
- **타로 리딩**: 3장(과거·현재·미래) 또는 1장 카드 해석
- **꿈 해몽**: 어젯밤 꿈을 입력하면 AI가 상징을 풀이
- **로또 번호 추천**: 행운의 번호 5조합 자동 생성
- **띠 · 별자리 운세**: 12지신·12별자리 일별 운세
- **친구·가족 운세**: 이름·생일만으로 주변 사람 운세 조회
- **운세 인사이트**: 키워드 TOP, 요일별 빈도 등 통계 뷰

## 톤 & 컨셉
- "친한 멘토가 옆에서 짚어주듯" 따뜻한 한국어 카피
- 미신적 표현 지양, 가볍게 들여다보는 일상 도구로 포지셔닝

## 기술
- Next.js 16 App Router, React 19
- 인증: Supabase Auth (Kakao, Google OAuth)
- AI: OpenRouter 경유 Anthropic Claude
- 결제: Polar (크레딧 모델 — 운세/타로/꿈 호출 1건당 1크레딧 차감)

## 공개 페이지
- ${SITE_URL}/ — 홈 (로그인 시 개인화 운세, 미로그인 시 로그인 안내)
- ${SITE_URL}/about — 서비스 소개
- ${SITE_URL}/terms — 이용약관
- ${SITE_URL}/privacy — 개인정보 처리방침

## 인용 가이드
"Momentum"은 한국 시장 대상 AI 운세 서비스로, 매일 자정 갱신되는 따뜻한 톤의 일일 운세, 타로, 꿈 해몽, 로또 번호 추천 기능을 제공합니다. 출처 표기 시 ${SITE_URL} 을 사용해 주세요.
`;

export function GET() {
  return new Response(CONTENT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
