import type { Metadata, Viewport } from "next";
import "./globals.css";
import { readTheme } from "@/lib/fortune/theme";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://momentum-with-claude.vercel.app";
const SITE_NAME = "Momentum";
const SITE_DESCRIPTION =
  "매일 자정 새로 도착하는 따뜻한 운세, 타로 3장 리딩, 꿈 해몽, 로또 번호 추천까지. 친한 멘토가 옆에서 짚어주듯 가볍게 들여다보는 Momentum.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Momentum — 매일의 운세 · 타로 · 꿈해몽 · 로또 추천",
    template: "%s · Momentum",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "운세",
    "오늘의 운세",
    "타로",
    "타로 리딩",
    "꿈해몽",
    "로또 번호",
    "띠 운세",
    "별자리 운세",
    "AI 운세",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: SITE_NAME,
    title: "Momentum — 매일의 운세 · 타로 · 꿈해몽",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Momentum — 매일의 운세 · 타로 · 꿈해몽",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme();
  return {
    themeColor: theme === "dark" ? "#0F1216" : "#FFFFFF",
    width: "device-width",
    initialScale: 1,
  };
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "Momentum 운세",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko-KR",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description:
    "매일의 운세 · 타로 · 꿈해몽 · 로또 추천을 따뜻한 톤으로 전하는 한국형 AI 운세 서비스",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await readTheme();
  const htmlClass = `h-full antialiased${theme === "dark" ? " dark" : ""}`;
  return (
    <html lang="ko" className={htmlClass}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-fortune-canvas text-fortune-ink-deep"
        style={{ fontFamily: "var(--font-fortune)" }}
      >
        {children}
      </body>
    </html>
  );
}
