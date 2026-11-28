"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import {
  formError,
  formSuccess,
  type FormActionState,
} from "@/lib/form-action";
import { logError } from "@/lib/log";
import { createPersonalWallet } from "@/lib/wallet";

const SESSION_ERROR =
  "Your session expired. Sign in again to set up your space.";
const CREATE_ERROR = "Unable to set up your space. Try again.";

export async function startWallet(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) {
    return formError(SESSION_ERROR);
  }

  try {
    await createPersonalWallet({
      actorId: session.user.id,
      actorName: session.user.name,
    });
  } catch (cause) {
    logError("wallet.setup.failed", {
      userId: session.user.id,
      outcome: "failed",
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return formError(CREATE_ERROR);
  }

  revalidatePath("/wizard");
  return formSuccess("Your space is ready");
}
