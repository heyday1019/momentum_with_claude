import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/fortune/app-header";
import { BackButton } from "@/components/fortune/back-button";
import { TarotDeckStage } from "@/components/fortune/tarot-deck-stage";
import { MarketingLanding } from "@/components/marketing/landing";
import { createClient } from "@/lib/supabase/server";
import { LANDINGS, buildLandingMetadata } from "@/lib/seo/landings";

export const metadata: Metadata = buildLandingMetadata("tarot");

export default async function TarotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <MarketingLanding content={LANDINGS.tarot} />;
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
            궁금한 미래를 떠올리며
          </h1>
          <p className="text-base font-bold text-fortune-ink leading-relaxed">
            마음 속에 질문 하나를 그려보고,
            <br />
            카드를 뽑아보세요.
          </p>
        </div>

        <TarotDeckStage />
      </section>
    </main>
  );
}
