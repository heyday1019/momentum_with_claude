import { ImageResponse } from "next/og";

export const alt = "Momentum — 매일의 운세 · 타로 · 꿈해몽";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "96px",
          background:
            "linear-gradient(135deg, #14161A 0%, #2A2A60 55%, #3F3FAA 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
            opacity: 0.85,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 40, letterSpacing: -0.5 }}>Momentum</div>
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: -2.5,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>매일의 운세 · 타로</span>
          <span>꿈해몽 · 로또 추천</span>
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.72,
            marginTop: 40,
            letterSpacing: -0.5,
          }}
        >
          매일 자정, 따뜻한 운세가 도착해요
        </div>
      </div>
    ),
    { ...size },
  );
}
