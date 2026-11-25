"use client";

import { useActionState } from "react";

import { FormActionErrors } from "@/components/FormActionErrors";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { initialFormActionState } from "@/lib/form-action";

import { startHousehold } from "../_actions/household";

export function GetStartedForm() {
  const [state, action] = useActionState(
    startHousehold,
    initialFormActionState,
  );

  return (
    <form action={action} className="w-full space-y-3">
      <FormActionErrors state={state} />
      <FormSubmitButton
        className="w-full"
        pendingLabel="Setting up your space…"
      >
        Get started
      </FormSubmitButton>
    </form>
  );
}
