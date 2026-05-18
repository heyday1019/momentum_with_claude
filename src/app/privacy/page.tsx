import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description:
    "Momentum 개인정보 처리방침 — 수집 항목, 이용 목적, 보관 기간, 제3자 제공 및 위탁 현황을 안내합니다.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. 수집하는 개인정보",
    body: "Momentum은 Kakao 또는 Google 계정을 통한 로그인 시 이메일, 닉네임, 프로필 사진을 수집합니다. 운세 개인화를 위해 이름, 생년월일, 성별 등을 회원이 직접 입력할 수 있습니다.",
  },
  {
    heading: "2. 수집 및 이용 목적",
    body: "수집된 정보는 회원 식별, 개인화된 운세·타로·꿈 해몽 결과 제공, 크레딧 결제 및 환불 처리, 서비스 개선을 위한 통계 분석 목적으로만 이용됩니다.",
  },
  {
    heading: "3. 보관 및 파기",
    body: "회원 탈퇴 시 모든 식별 정보는 즉시 파기됩니다. 단, 전자상거래법 등 관련 법령이 정하는 경우 정해진 기간 동안 보관할 수 있습니다.",
  },
  {
    heading: "4. 제3자 제공 및 위탁",
    body: "서비스 운영을 위해 다음 사업자에게 일부 정보가 위탁 처리됩니다. (1) Supabase — 인증 및 데이터 저장 (2) OpenRouter / Anthropic — AI 응답 생성을 위한 입력 프롬프트 (3) Polar — 결제 처리.",
  },
  {
    heading: "5. 이용자의 권리",
    body: "회원은 언제든 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있으며, 설정 페이지 또는 고객 문의를 통해 행사할 수 있습니다.",
  },
  {
    heading: "6. 쿠키 사용",
    body: "로그인 세션 유지를 위해 필수 쿠키만 사용하며, 광고 추적 쿠키는 사용하지 않습니다.",
  },
  {
    heading: "7. 보호 책임자",
    body: "개인정보 보호 책임자: Momentum 운영팀 (문의는 추후 안내될 고객센터 이메일을 통해 접수합니다).",
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas px-4 py-12">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-bold text-fortune-charcoal">
            Privacy
          </span>
          <h1 className="text-[32px] font-medium leading-tight text-fortune-ink-deep">
            개인정보 처리방침
          </h1>
          <p className="text-sm text-fortune-steel">
            최종 업데이트: 2026년 5월 16일
          </p>
        </header>

        <section className="flex flex-col gap-5">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="flex flex-col gap-2">
              <h2 className="text-base font-bold text-fortune-ink-deep">
                {s.heading}
              </h2>
              <p className="text-sm leading-relaxed text-fortune-ink">
                {s.body}
              </p>
            </div>
          ))}
        </section>

        <footer className="pt-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border-2 border-fortune-ink-deep px-6 py-3 text-sm font-bold text-fortune-ink-deep"
          >
            홈으로
          </Link>
        </footer>
      </article>
    </main>
  );
}
