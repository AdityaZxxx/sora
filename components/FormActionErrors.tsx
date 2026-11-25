"use client";

import type { FormActionState } from "@/lib/form-action";

export function FormActionErrors({ state }: { state: FormActionState }) {
  if (state.status !== "error") {
    return null;
  }

  return (
    <div className="space-y-1">
      <p role="alert" className="text-sm text-destructive">
        {state.message}
      </p>
      {Object.entries(state.fieldErrors).map(([field, message]) => (
        <p role="alert" className="text-sm text-destructive" key={field}>
          <span className="font-medium capitalize">{field}:</span> {message}
        </p>
      ))}
    </div>
  );
}
