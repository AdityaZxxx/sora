import { jsonReadResponse, unauthorized } from "@/lib/api-route";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const memberships = await prisma.walletMembership.findMany({
    where: { userId: session.user.id, leftAt: null },
    select: { walletId: true, role: true },
  });
  return jsonReadResponse(
    request,
    Object.fromEntries(
      memberships.map((membership) => [membership.walletId, membership.role]),
    ),
  );
}
