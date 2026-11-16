"use server";

import { redirect } from "next/navigation";

import { type ActionResult, fail } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { setActiveHouseholdCookie } from "@/lib/household";
import { joinHouseholdByInviteToken } from "@/lib/invites";

// The join lives in a Server Action rather than the page render: Next.js
// forbids writing cookies while a page renders.
export async function joinHouseholdByToken(
  token: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  try {
    const householdId = await joinHouseholdByInviteToken(
      token,
      session.user.id,
      session.user.name,
    );
    await setActiveHouseholdCookie(householdId);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }

  redirect("/");
}
