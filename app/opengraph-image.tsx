import { ImageResponse } from "next/og";

export const alt = "Sora, one shared ledger for your household";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0E0F10",
        color: "#FAFAFA",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#4ADE80",
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#FB7185",
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#818CF8",
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>
          Sora
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 66,
          fontWeight: 700,
          lineHeight: 1.15,
          textAlign: "center",
        }}
      >
        One ledger. Every goal.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 22,
          fontSize: 28,
          color: "#A3A3A3",
        }}
      >
        Shared finances for couples and households
      </div>
    </div>,
    size,
  );
}
