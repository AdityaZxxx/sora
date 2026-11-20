"use client";

import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  pendingLabel: string;
  children: ReactNode;
}

const AuthSubmitButton = ({
  pendingLabel,
  children,
}: AuthSubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-10 w-full gap-2 sm:h-9"
      disabled={pending}
      aria-busy={pending}
    >
      {pending && (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
};

export default AuthSubmitButton;
