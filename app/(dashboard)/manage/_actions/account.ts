"use server";

import type { FormActionState } from "@/lib/form-action";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { assertAccountDeletable, deleteUserAccount } from "@/lib/account";
import { auth, getSession } from "@/lib/auth";

export async function deleteAccountForm(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  await assertAccountDeletable(session.user.id);

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
