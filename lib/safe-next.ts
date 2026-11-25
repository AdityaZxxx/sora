import { matchesRoute } from "@/lib/routes";

const SAFE_ORIGIN = "https://sora.invalid";

type RouteSegments = readonly string[];

export function safeNext(
  next: string | string[] | null | undefined,
  guestRoutes: readonly RouteSegments[],
) {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    !URL.canParse(next, SAFE_ORIGIN)
  ) {
    return undefined;
  }

  const url = new URL(next, SAFE_ORIGIN);
  if (
    url.origin !== SAFE_ORIGIN ||
    guestRoutes.some((segments) => matchesRoute(url.pathname, segments))
  ) {
    return undefined;
  }

  return next;
}
