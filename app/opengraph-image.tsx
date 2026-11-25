// oxlint-disable next/no-img-element, jsx-a11y/alt-text -- Satori renders the img into a PNG; next/image and DOM alt are not applicable here.
import { ImageResponse } from "next/og";

import { logoSrc, ogColors, ogFonts, OG_SIZE } from "@/lib/og-assets";

export const alt = "Sora, one shared ledger for your wallet";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${ogColors.background}, ${ogColors.card})`,
      }}
    >
      <div
        style={{
          width: 1000,
          height: 470,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ogColors.card,
          border: `1px solid ${ogColors.border}`,
          borderRadius: 28,
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src={logoSrc}
              width={46}
              height={46}
              style={{ width: 46, height: 46 }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Geist",
                fontSize: 30,
                fontWeight: 600,
                color: ogColors.foreground,
              }}
            >
              Sora
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                display: "flex",
                width: 14,
                height: 14,
                borderRadius: 7,
                background: ogColors.primary,
              }}
            />
            <div
              style={{
                display: "flex",
                width: 14,
                height: 14,
                borderRadius: 7,
                background: ogColors.income,
              }}
            />
            <div
              style={{
                display: "flex",
                width: 14,
                height: 14,
                borderRadius: 7,
                background: ogColors.expense,
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 58,
              fontWeight: 600,
              lineHeight: 1.1,
              color: ogColors.foreground,
              maxWidth: 872,
            }}
          >
            One ledger. Every goal.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 23,
              fontWeight: 400,
              color: ogColors.muted,
              marginTop: 20,
            }}
          >
            Shared finances for couples and wallets
          </div>
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: ogFonts },
  );
}
