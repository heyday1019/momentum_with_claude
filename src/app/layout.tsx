import type { Metadata, Viewport } from "next";
import "./globals.css";
import { readTheme } from "@/lib/fortune/theme";

export const metadata: Metadata = {
  title: "운세 — 오늘의 나, 가볍게",
  description: "매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.",
  applicationName: "Momentum",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Momentum",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await readTheme();
  return {
    themeColor: theme === "dark" ? "#0F1216" : "#FFFFFF",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

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
