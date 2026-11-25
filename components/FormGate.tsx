"use client";

import type { ReactNode } from "react";

type Props = {
  hydrated: boolean;
  action: (formData: FormData) => void | Promise<void>;
  plain: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FormGate({
  hydrated,
  action,
  plain,
  className = "space-y-4 rounded-lg border p-4",
  children,
}: Props) {
  return (
    <>
      {!hydrated ? (
        <form action={action} className={className}>
          {plain}
        </form>
      ) : null}
      <div className={hydrated ? undefined : "hidden"}>{children}</div>
    </>
  );
}
