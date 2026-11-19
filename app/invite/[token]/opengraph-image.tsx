import { ImageResponse } from "next/og";

import { getInviteByToken } from "@/lib/invite-context";

export const alt = "A household invite on Sora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const householdName = invite?.household.name ?? "your household";
  const inviterName = invite?.createdBy.name ?? "A member";

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
          fontSize: 32,
          fontWeight: 700,
          color: "#A3A3A3",
          marginBottom: 28,
        }}
      >
        Sora
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 1000,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.15,
          textAlign: "center",
        }}
      >
        Join {householdName}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 900,
          marginTop: 24,
          fontSize: 28,
          color: "#A3A3A3",
          textAlign: "center",
        }}
      >
        {inviterName} invited you to track finances together
      </div>
    </div>,
    size,
  );
}
