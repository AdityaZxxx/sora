"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { deleteUserAccount } from "@/lib/account";
import { type ActionResult } from "@/lib/action-result";
import { auth, getSession } from "@/lib/auth";

export async function deleteAccount(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  await deleteUserAccount(session.user.id, session.user.email);

  redirect("/sign-in");
}
