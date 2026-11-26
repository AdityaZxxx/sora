"use client";

import { useActionState } from "react";

import { FormActionErrors } from "@/components/FormActionErrors";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { initialFormActionState } from "@/lib/form-action";

import { startWallet } from "../_actions/wallet";

export function GetStartedForm() {
  const [state, action] = useActionState(startWallet, initialFormActionState);

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
