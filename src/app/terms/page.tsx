import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "Momentum 이용약관 — 서비스 정의, 회원 의무, 결제·환불, 면책 조항을 안내합니다.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "제1조 (목적)",
    body: "본 약관은 Momentum(이하 \"서비스\")이 제공하는 운세·타로·꿈 해몽 등 AI 기반 콘텐츠 서비스의 이용 조건과 절차, 회원과 서비스의 권리·의무·책임 사항을 정함을 목적으로 합니다.",
  },
  {
    heading: "제2조 (서비스의 성격)",
    body: "서비스는 오락 및 자기 성찰 목적의 콘텐츠를 제공하며, 의료·법률·재무 등 전문적 판단을 대신하지 않습니다. 회원은 서비스가 제공하는 결과를 참고 자료로만 활용해야 합니다.",
  },
  {
    heading: "제3조 (회원가입 및 계정)",
    body: "회원은 Kakao 또는 Google 계정으로 로그인하여 서비스를 이용할 수 있으며, 계정 정보의 관리 책임은 회원 본인에게 있습니다.",
  },
  {
    heading: "제4조 (크레딧 및 결제)",
    body: "운세·타로·꿈 해몽 등 일부 AI 호출은 크레딧을 차감합니다. 크레딧은 Polar 결제를 통해 충전하며, 환불 정책은 Polar의 정책 및 국내 전자상거래법을 따릅니다.",
  },
  {
    heading: "제5조 (금지 행위)",
    body: "타인의 정보 도용, 서비스의 정상적 운영을 방해하는 자동화 접근, AI 응답의 무단 대량 수집 행위는 금지됩니다.",
  },
  {
    heading: "제6조 (면책)",
    body: "서비스가 제공하는 운세·해석 결과로 인한 의사 결정의 결과에 대해 운영자는 책임을 지지 않습니다.",
  },
  {
    heading: "제7조 (약관 변경)",
    body: "본 약관은 관련 법령 또는 서비스 정책 변경에 따라 개정될 수 있으며, 변경 시 사전 공지합니다.",
  },
];

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas px-4 py-12">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-bold text-fortune-charcoal">Terms</span>
          <h1 className="text-[32px] font-medium leading-tight text-fortune-ink-deep">
            이용약관
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
