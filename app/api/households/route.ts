import { NextResponse } from "next/server";

import { withHouseholdRoute } from "@/lib/api-route";
import prisma from "@/lib/prisma";

export async function GET() {
  return withHouseholdRoute(async (result) => {
    const userId = result.session.user.id;

    const memberships = await prisma.householdMembership.findMany({
      where: {
        userId,
      },
      include: {
        household: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    const householdIds = memberships.map(
      (membership) => membership.householdId,
    );
    const memberRows = await prisma.householdMembership.findMany({
      where: {
        householdId: {
          in: householdIds,
        },
      },
      select: {
        householdId: true,
      },
    });
    const countByHouseholdId = new Map<string, number>();
    for (const row of memberRows) {
      countByHouseholdId.set(
        row.householdId,
        (countByHouseholdId.get(row.householdId) ?? 0) + 1,
      );
    }

    return NextResponse.json({
      active: {
        id: result.household.id,
      },
      households: memberships.map((membership) => ({
        id: membership.household.id,
        name: membership.household.name,
        currency: membership.household.currency,
        memberCount: countByHouseholdId.get(membership.household.id) ?? 1,
        joinedAt: membership.joinedAt,
      })),
    });
  });
}
