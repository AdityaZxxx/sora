"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { removeAvatar, saveAvatar } from "@/lib/avatar";
import { DomainError } from "@/lib/errors";
import {
  formError,
  formSuccess,
  formText,
  type FormActionState,
} from "@/lib/form-action";
import { updateDisplayName } from "@/lib/profile";

export async function updateDisplayNameForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  try {
    await updateDisplayName(session.user.id, formText(formData, "name"));
    return formSuccess("Name updated");
  } catch (cause) {
    if (cause instanceof DomainError) {
      return formError(cause.message, { name: cause.message });
    }
    throw cause;
  }
}

export async function uploadAvatarForm(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return formError("Choose an image to upload");
  }

  try {
    await saveAvatar(session.user.id, file);
    return formSuccess("Avatar updated");
  } catch (cause) {
    if (cause instanceof DomainError) {
      return formError(cause.message);
    }
    throw cause;
  }
}

export async function removeAvatarForm(
  _previous: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  try {
    await removeAvatar(session.user.id);
    return formSuccess("Avatar removed");
  } catch (cause) {
    if (cause instanceof DomainError) {
      return formError(cause.message);
    }
    throw cause;
  }
}
