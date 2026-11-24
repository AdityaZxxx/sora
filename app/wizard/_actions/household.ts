"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createPersonalHousehold } from "@/lib/household";

export async function startHousehold(_formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) {
    return;
  }

  await createPersonalHousehold(session.user.id);
  revalidatePath("/wizard");
}
