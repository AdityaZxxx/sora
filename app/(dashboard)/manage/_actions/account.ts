"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { deleteUserAccount } from "@/lib/account";
import { type ActionResult } from "@/lib/action-result";
import { auth, getSession } from "@/lib/auth";
import { fromActionResult, type FormActionState } from "@/lib/form-action";

export async function deleteAccount(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  await deleteUserAccount(session.user.id, session.user.email);

  const cookieStore = await cookies();
  cookieStore.set("sora_clear_offline", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });

  redirect("/sign-in");
}

export async function deleteAccountForm(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  return fromActionResult(await deleteAccount(), "Your account was deleted");
}
