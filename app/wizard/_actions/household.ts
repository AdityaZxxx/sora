"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import {
  formError,
  formSuccess,
  type FormActionState,
} from "@/lib/form-action";
import { createPersonalHousehold } from "@/lib/household";
import { logError } from "@/lib/log";

const SESSION_ERROR =
  "Your session expired. Sign in again to set up your space.";
const CREATE_ERROR = "Unable to set up your space. Try again.";

export async function startHousehold(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) {
    return formError(SESSION_ERROR);
  }

  try {
    await createPersonalHousehold(session.user.id);
  } catch (cause) {
    logError("household.setup.failed", {
      userId: session.user.id,
      outcome: "failed",
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return formError(CREATE_ERROR);
  }

  revalidatePath("/wizard");
  return formSuccess("Your space is ready");
}
