import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/fortune/app-header";
import { BackButton } from "@/components/fortune/back-button";
import { DreamForm } from "@/components/fortune/dream-form";
import { MarketingLanding } from "@/components/marketing/landing";
import { createClient } from "@/lib/supabase/server";
import { LANDINGS, buildLandingMetadata } from "@/lib/seo/landings";

export const metadata: Metadata = buildLandingMetadata("dream");

export default async function DreamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <MarketingLanding content={LANDINGS.dream} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/" label="홈" />

        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            꿈 해몽
          </h1>
          <p className="text-base font-bold text-fortune-ink leading-relaxed">
            어젯밤 꾼 꿈을 적어주시면
            <br />
            등장한 상징과 흐름을 풀어드릴게요.
          </p>
        </div>

        <Link
          href="/dream/journal"
          className="rounded-2xl border border-fortune-hairline-soft bg-fortune-surface-soft p-4 flex items-center gap-3"
        >
          <span className="size-10 rounded-full bg-fortune-canvas inline-flex items-center justify-center shrink-0">
            <BookOpen className="size-4 text-fortune-ink-deep" />
          </span>
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-sm font-bold text-fortune-ink-deep">
              꿈 일기 보기
            </span>
            <span className="text-xs font-bold text-fortune-charcoal">
              지난 풀이 모아보기
            </span>
          </div>
          <ArrowRight className="size-4 text-fortune-charcoal" />
        </Link>

        <DreamForm />
      </section>
    </main>
  );
}
