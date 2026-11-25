const SAFE_ORIGIN = "https://sora.invalid";

export function safeNext(next?: string | string[] | null) {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    !URL.canParse(next, SAFE_ORIGIN)
  ) {
    return undefined;
  }

  return new URL(next, SAFE_ORIGIN).origin === SAFE_ORIGIN ? next : undefined;
}
