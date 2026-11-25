import { jsonReadResponse, withWalletRoute } from "@/lib/api-route";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  return withWalletRoute(async (result) => {
    const wallet = await prisma.wallet.findUnique({
      where: { id: result.wallet.id },
      select: {
        id: true,
        name: true,
        currency: true,
        createdAt: true,
      },
    });
    return jsonReadResponse(request, wallet);
  });
}
