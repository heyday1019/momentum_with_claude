import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "Momentum은 매일 자정 새로 도착하는 한국형 AI 운세·타로·꿈해몽 서비스입니다. 친한 멘토가 옆에서 짚어주듯 따뜻한 톤으로 하루를 가볍게 들여다봅니다.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "서비스 소개",
    description:
      "매일 자정 새로 도착하는 한국형 AI 운세·타로·꿈해몽 서비스, Momentum.",
    url: "/about",
  },
};

const FEATURES = [
  {
    title: "오늘의 운세",
    body: "이름과 생년월일을 바탕으로 매일 자정 새로운 운세 카드가 도착해요.",
  },
  {
    title: "타로 3장 리딩",
    body: "과거 · 현재 · 미래의 흐름을 카드 한 장씩 펼쳐 풀어드립니다.",
  },
  {
    title: "꿈 해몽",
    body: "어젯밤 꿈을 적어 보내면 AI가 상징을 차분히 해석합니다.",
  },
  {
    title: "로또 번호 추천",
    body: "그날의 흐름에 맞춰 행운의 번호 5조합을 함께 골라드려요.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas px-4 py-12">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="text-sm font-bold text-fortune-charcoal">
            About Momentum
          </span>
          <h1 className="text-[36px] font-medium leading-tight tracking-tight text-fortune-ink-deep">
            매일 자정, 따뜻한 운세 한 줄
          </h1>
          <p className="text-base leading-relaxed text-fortune-ink">
            Momentum은 운세 · 타로 · 꿈 해몽 · 로또 번호 추천을 한 곳에서 만나는
            한국형 AI 운세 서비스예요. 친한 멘토가 옆에서 짚어주듯 가볍게,
            그러나 정성스럽게 하루를 들여다봅니다.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-medium text-fortune-ink-deep">
            이런 기능이 있어요
          </h2>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-5"
              >
                <div className="text-base font-bold text-fortune-ink-deep">
                  {f.title}
                </div>
                <p className="mt-1 text-sm text-fortune-charcoal">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-medium text-fortune-ink-deep">
            톤과 약속
          </h2>
          <p className="text-base leading-relaxed text-fortune-ink">
            운세는 결정을 대신해 주지 않아요. Momentum은 오늘 어떤 마음으로
            하루를 시작할지 짧게 짚어주는 도구로 만들어졌습니다. 미신적인
            단정 대신, 가볍게 들고 갈 수 있는 한 줄의 인사이트를 전하는 데
            집중합니다.
          </p>
        </section>

        <footer className="flex flex-col gap-2 pt-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full bg-fortune-ink-deep px-7 py-3 text-sm font-bold text-fortune-canvas"
          >
            오늘의 운세 보러 가기
          </Link>
          <div className="flex gap-4 pt-3 text-xs text-fortune-steel">
            <Link href="/terms" className="hover:underline">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:underline">
              개인정보 처리방침
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
