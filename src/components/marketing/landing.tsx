import Link from "next/link";
import {
  type LandingContent,
  type LandingSlug,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildServiceSchema,
} from "@/lib/seo/landings";

type Props = {
  content: LandingContent;
};

export function MarketingLanding({ content }: Props) {
  const slug: LandingSlug = content.slug;
  const breadcrumb = buildBreadcrumbSchema(slug);
  const service = buildServiceSchema(slug);
  const faq = buildFaqSchema(slug);

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <header className="border-b border-fortune-hairline-soft bg-fortune-canvas px-4 py-3">
        <nav
          aria-label="breadcrumb"
          className="mx-auto flex w-full max-w-2xl items-center gap-2 text-xs text-fortune-steel"
        >
          <Link href="/" className="hover:text-fortune-ink-deep">
            Momentum
          </Link>
          <span aria-hidden>·</span>
          <span className="text-fortune-ink">{content.category}</span>
        </nav>
      </header>

      <section className="px-4 py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <span className="text-sm font-bold text-fortune-charcoal">
            {content.category}
          </span>
          <h1 className="text-[36px] font-medium leading-tight tracking-tight text-fortune-ink-deep">
            {content.title}
          </h1>
          <p className="text-base leading-relaxed text-fortune-ink">
            {content.lead}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={content.primaryCta.href}
              className="inline-flex items-center rounded-full bg-fortune-ink-deep px-7 py-3 text-sm font-bold text-fortune-canvas"
            >
              {content.primaryCta.label}
            </Link>
            {content.secondaryCta && (
              <Link
                href={content.secondaryCta.href}
                className="inline-flex items-center rounded-full border-2 border-fortune-ink-deep px-6 py-3 text-sm font-bold text-fortune-ink-deep"
              >
                {content.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <h2 className="text-2xl font-medium text-fortune-ink-deep">
            이런 점이 좋아요
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {content.features.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-5"
              >
                <div className="text-base font-bold text-fortune-ink-deep">
                  {f.title}
                </div>
                <p className="mt-1 text-sm text-fortune-charcoal leading-relaxed">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <h2 className="text-2xl font-medium text-fortune-ink-deep">
            {content.example.heading}
          </h2>
          <blockquote className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-surface-soft p-6 text-base leading-relaxed text-fortune-ink-deep">
            {content.example.body}
          </blockquote>
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <h2 className="text-2xl font-medium text-fortune-ink-deep">
            자주 묻는 질문
          </h2>
          <div className="flex flex-col gap-3">
            {content.faqs.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="rounded-xl border border-fortune-hairline-soft bg-fortune-canvas p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-bold text-fortune-ink-deep">
                  <span>{f.q}</span>
                  <span
                    aria-hidden
                    className="text-xs text-fortune-steel transition-transform"
                  >
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fortune-ink">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 rounded-[32px] bg-gradient-to-br from-[#14161A] via-[#2A2A60] to-[#3F3FAA] p-8 text-fortune-canvas">
          <span className="text-sm font-bold opacity-80">Momentum</span>
          <h2 className="text-2xl font-medium leading-tight">
            매일 자정, 따뜻한 한 줄이 도착해요
          </h2>
          <Link
            href={content.primaryCta.href}
            className="mt-2 inline-flex items-center rounded-full bg-fortune-canvas px-7 py-3 text-sm font-bold text-fortune-ink-deep"
          >
            {content.primaryCta.label}
          </Link>
        </div>
      </section>

      <footer className="border-t border-fortune-hairline-soft px-4 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-4 text-xs text-fortune-steel">
          <Link href="/about" className="hover:text-fortune-ink-deep">
            서비스 소개
          </Link>
          <Link href="/terms" className="hover:text-fortune-ink-deep">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-fortune-ink-deep">
            개인정보 처리방침
          </Link>
        </div>
      </footer>
    </main>
  );
}
