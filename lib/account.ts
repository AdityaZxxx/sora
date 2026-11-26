import { OWNER_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";

export async function assertAccountDeletable(userId: string) {
  const ownerMemberships = await prisma.walletMembership.findMany({
    where: { userId, role: OWNER_ROLE },
    select: { walletId: true },
  });
  if (ownerMemberships.length === 0) return;

  const sharedWallets = await prisma.wallet.findMany({
    where: {
      id: { in: ownerMemberships.map((membership) => membership.walletId) },
      memberships: { some: { userId: { not: userId } } },
    },
    select: { id: true },
  });
  if (sharedWallets.length > 0) {
    throw new DomainError(
      "Appoint a co-owner as the new owner before deleting your account",
    );
  }
}

// seam-parse-exempt: inputs are session values, never user input.
export async function deleteUserAccount(userId: string, email: string) {
  await prisma.$transaction(async (tx) => {
    // 'every' is vacuously true for empty wallets; 'some' prevents deleting them.
    const soleMemberWallets = await tx.wallet.findMany({
      where: {
        AND: [
          { memberships: { some: { userId } } },
          { memberships: { every: { userId } } },
        ],
      },
      select: { id: true },
    });

    await tx.wallet.deleteMany({
      where: { id: { in: soleMemberWallets.map(({ id }) => id) } },
    });

    // Verification has no FK to User; Better Auth keys these rows by the email
    // inside the identifier (email verification, password reset).
    await tx.verification.deleteMany({
      where: { identifier: { contains: email } },
    });

    await tx.user.delete({ where: { id: userId } });
  });
}
