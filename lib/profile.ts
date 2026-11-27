import { z } from "zod";

import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";

export const DisplayNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(50, "Use at most 50 characters"),
});

export async function updateDisplayName(userId: string, name: string) {
  const parsed = DisplayNameSchema.safeParse({ name });
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Enter a valid name",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
  });
}
