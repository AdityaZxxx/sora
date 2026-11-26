import { cache } from "react";

import prisma from "@/lib/prisma";

export const getInviteByToken = cache(async (token: string) =>
  prisma.inviteLink.findFirst({
    where: { token, revokedAt: null },
    select: {
      walletId: true,
      wallet: {
        select: {
          name: true,
          memberships: {
            take: 4,
            select: { user: { select: { name: true } } },
          },
        },
      },
      createdBy: { select: { name: true } },
    },
  }),
);
