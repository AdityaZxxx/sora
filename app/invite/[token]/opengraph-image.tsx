// oxlint-disable next/no-img-element, jsx-a11y/alt-text -- Satori renders the img into a PNG; next/image and DOM alt are not applicable here.
import { ImageResponse } from "next/og";

import { getInviteByToken } from "@/lib/invite-context";
import { logoSrc, ogColors, ogFonts, OG_SIZE } from "@/lib/og-assets";

export const alt = "A household invite on Sora";
export const size = OG_SIZE;
export const contentType = "image/png";

const avatarColors = [
  { background: ogColors.primary, color: ogColors.foreground },
  { background: ogColors.income, color: ogColors.background },
  { background: ogColors.expense, color: ogColors.foreground },
  { background: ogColors.lightBlue, color: ogColors.background },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "?";
}

function AvatarStack({ names }: { names: string[] }) {
  const ordered = names.toReversed();
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {ordered.map((name, position) => {
        const memberIndex = names.length - 1 - position;
        const avatar = avatarColors[memberIndex % avatarColors.length];
        return (
          <div
            key={`${name}-${memberIndex}`}
            style={{
              display: "flex",
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: position === 0 ? 0 : -14,
              borderRadius: 26,
              border: `2px solid ${ogColors.card}`,
              background: avatar.background,
              fontFamily: "Geist",
              fontSize: 16,
              fontWeight: 600,
              color: avatar.color,
            }}
          >
            {initials(name)}
          </div>
        );
      })}
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const householdName = invite?.household.name ?? "Track money together";
  const nameFontSize =
    householdName.length > 32 ? 38 : householdName.length > 22 ? 46 : 54;
  const members = invite?.household.memberships.map((m) => m.user.name) ?? [];

  const image = new ImageResponse(
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
          padding: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={logoSrc}
            width={28}
            height={28}
            style={{ width: 28, height: 28 }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 20,
              fontWeight: 600,
              color: ogColors.foreground,
            }}
          >
            Sora
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
              fontSize: nameFontSize,
              fontWeight: 600,
              lineHeight: 1.1,
              textAlign: "left",
              color: ogColors.foreground,
              maxWidth: 860,
            }}
          >
            {householdName}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 20,
              fontWeight: 400,
              color: ogColors.muted,
              textAlign: "left",
              maxWidth: 860,
              marginTop: 16,
            }}
          >
            {invite
              ? `${invite.createdBy.name} invited you to join this household`
              : "Open Sora to join a household"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 19,
              fontWeight: 600,
              color: ogColors.foreground,
              background: ogColors.primary,
              borderRadius: 999,
              padding: "11px 24px",
            }}
          >
            {invite ? "Open Sora to join" : "Open Sora"}
          </div>
          <AvatarStack names={members} />
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: ogFonts },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  );

  return image;
}
