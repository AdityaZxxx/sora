"use client";

import type { ActionResult } from "@/lib/action-result";
import type { ReactElement, ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";

interface Props<TInput> {
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  loadingLabel: string;
  successMessage: string;
  errorMessage: string;
  toastId: string;
  input?: TInput;
  action: (input: TInput) => Promise<ActionResult<unknown>>;
  queryKeys: string[][];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ConfirmDialog<TInput>({
  title,
  description,
  confirmLabel,
  loadingLabel,
  successMessage,
  errorMessage,
  toastId,
  input,
  action,
  queryKeys,
  trigger,
  open: openProp,
  onOpenChange,
}: Props<TInput>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => unwrapAction(await action(input as TInput)),
    onSuccess: async () => {
      toast.success(successMessage, { id: toastId });
      await Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      setOpen(false);
    },
    onError: (error) => {
      toast.error(actionErrorMessage(error, errorMessage), { id: toastId });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger render={trigger as ReactElement} /> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading(loadingLabel, { id: toastId });
              confirmMutation.mutate();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
