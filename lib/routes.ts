export const guestRoutes = [["sign-in"], ["sign-up"]] as const;

export const edgeRedirectRoutes = [["sign-in"]] as const;

export function matchesRoute(pathname: string, segments: readonly string[]) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    parts.length >= segments.length &&
    segments.every((segment, index) => parts[index] === segment)
  );
}
