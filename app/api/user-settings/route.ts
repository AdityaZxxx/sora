import { jsonReadResponse, withHouseholdRoute } from "@/lib/api-route";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  return withHouseholdRoute(async (result) => {
    const household = await prisma.household.findUnique({
      where: { id: result.household.id },
      select: {
        id: true,
        name: true,
        currency: true,
        createdAt: true,
      },
    });
    return jsonReadResponse(request, household);
  });
}
