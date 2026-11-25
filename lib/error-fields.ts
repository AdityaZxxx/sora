export type ErrorFields = {
  error: string;
  stack?: string;
  digest?: string;
};

export function errorFields(cause: unknown): ErrorFields {
  if (typeof cause !== "object" || cause === null) {
    return { error: String(cause) };
  }

  const { message, stack, digest } = cause as {
    message?: unknown;
    stack?: unknown;
    digest?: unknown;
  };

  return {
    error: typeof message === "string" ? message : String(cause),
    stack: typeof stack === "string" ? stack : undefined,
    digest: typeof digest === "string" ? digest : undefined,
  };
}
