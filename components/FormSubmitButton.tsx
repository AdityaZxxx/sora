"use client";

import type { ComponentProps, ReactNode } from "react";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type Props = Omit<ComponentProps<typeof Button>, "children"> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function FormSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
