"use client";

import type { FormActionState } from "@/lib/form-action";
import type { QueryKey } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { FormSubmitButton } from "@/components/FormSubmitButton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useHydrated } from "@/hooks/use-hydrated";
import { initialFormActionState } from "@/lib/form-action";

interface Props {
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  loadingLabel: string;
  successMessage: string;
  errorMessage: string;
  toastId: string;
  input?: Record<string, string>;
  formAction: (
    previous: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  queryKeys: QueryKey[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  loadingLabel,
  successMessage,
  errorMessage,
  toastId,
  input,
  formAction,
  queryKeys,
  trigger,
  open: openProp,
  onOpenChange,
  onSuccess,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const [plainState, plainAction] = useActionState(
    formAction,
    initialFormActionState,
  );

  const submit = async (
    previous: FormActionState,
    formData: FormData,
  ): Promise<FormActionState> => {
    const result = await formAction(previous, formData);
    if (result.status === "error") {
      toast.error(result.message || errorMessage, { id: toastId });
      return result;
    }

    toast.success(result.message || successMessage, { id: toastId });
    await Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    setOpen(false);
    onSuccess?.();
    return result;
  };

  const [state, action] = useActionState(submit, initialFormActionState);

  const hiddenFields = Object.entries(input ?? {}).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  return (
    <>
      {!hydrated ? (
        <form action={plainAction} className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {hiddenFields}
          {plainState.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {plainState.message}
            </p>
          )}
          <FormSubmitButton variant="destructive" pendingLabel={loadingLabel}>
            {confirmLabel}
          </FormSubmitButton>
        </form>
      ) : null}
      <div className={hydrated ? undefined : "hidden"}>
        <AlertDialog open={open} onOpenChange={setOpen}>
          {trigger ? (
            <AlertDialogTrigger render={trigger as ReactElement} />
          ) : null}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <form action={action}>
              {hiddenFields}
              {state.status === "error" && (
                <p role="alert" className="pb-3 text-sm text-destructive">
                  {state.message}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <FormSubmitButton
                  variant="destructive"
                  pendingLabel={loadingLabel}
                >
                  {confirmLabel}
                </FormSubmitButton>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default ConfirmDialog;
