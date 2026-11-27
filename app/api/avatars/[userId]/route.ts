import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const { userId } = await context.params;
  if (userId !== session.user.id) {
    const sharedMembership = await prisma.walletMembership.findFirst({
      where: {
        userId: session.user.id,
        leftAt: null,
        wallet: {
          memberships: { some: { userId, leftAt: null } },
        },
      },
      select: { walletId: true },
    });
    if (!sharedMembership) return new Response(null, { status: 404 });
  }

  const avatar = await prisma.userAvatar.findUnique({
    where: { userId },
    select: { data: true, contentType: true },
  });
  if (!avatar) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
