import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketingLanding } from "@/components/marketing/landing";
import { createClient } from "@/lib/supabase/server";
import { LANDINGS, buildLandingMetadata } from "@/lib/seo/landings";

export const metadata: Metadata = buildLandingMetadata("fortune");

export default async function FortuneLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return <MarketingLanding content={LANDINGS.fortune} />;
}
