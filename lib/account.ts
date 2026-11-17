import prisma from "@/lib/prisma";

// seam-parse-exempt: inputs are session values, never user input.
export async function deleteUserAccount(userId: string, email: string) {
  await prisma.$transaction(async (tx) => {
    // 'every' is vacuously true for empty households; 'some' prevents deleting them.
    const soleMemberHouseholds = await tx.household.findMany({
      where: {
        AND: [
          { memberships: { some: { userId } } },
          { memberships: { every: { userId } } },
        ],
      },
      select: { id: true },
    });

    await tx.household.deleteMany({
      where: { id: { in: soleMemberHouseholds.map(({ id }) => id) } },
    });

    // Verification has no FK to User; Better Auth keys these rows by the email
    // inside the identifier (email verification, password reset).
    await tx.verification.deleteMany({
      where: { identifier: { contains: email } },
    });

    await tx.user.delete({ where: { id: userId } });
  });
}
