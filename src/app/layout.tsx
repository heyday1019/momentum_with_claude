import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "운세 — 오늘의 나, 가볍게",
  description: "매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-fortune-canvas text-fortune-ink-deep"
        style={{ fontFamily: "var(--font-fortune)" }}
      >
        {children}
      </body>
    </html>
  );
}
