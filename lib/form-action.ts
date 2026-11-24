import type { ActionResult } from "@/lib/action-result";

export type FormActionState<T = unknown> = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  data?: T;
};

export const initialFormActionState: FormActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

export function formSuccess<T>(message: string, data?: T): FormActionState<T> {
  return { status: "success", message, fieldErrors: {}, data };
}

export function formError<T>(
  message: string,
  fieldErrors: Record<string, string> = {},
): FormActionState<T> {
  return { status: "error", message, fieldErrors };
}

export function fromActionResult<T>(
  result: ActionResult<T>,
  fallback: string,
  fieldErrors: Record<string, string> = {},
): FormActionState<T> {
  return result.ok
    ? formSuccess(fallback, result.data)
    : formError(result.message || fallback, fieldErrors);
}

type FormIssue = { path: readonly PropertyKey[]; message: string };

export function fieldErrorsFromIssues(issues: readonly FormIssue[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function formOptionalText(formData: FormData, name: string) {
  return formText(formData, name) || undefined;
}

export function formDate(formData: FormData, name: string) {
  const value = formText(formData, name);
  return value ? new Date(value) : undefined;
}

export function formFlag(formData: FormData, name: string) {
  return formText(formData, name) === "true";
}
