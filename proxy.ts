import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/http-error";

const publicPrefixes = ["/invite"];
const protectedPrefixes = ["/transactions", "/manage", "/wizard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isPublic = publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthApi = pathname.startsWith("/api/auth");
  const isCronApi = pathname.startsWith("/api/cron");
  const isTokenApi =
    pathname === "/api/mcp" || pathname.startsWith("/api/mcp/");
  const isApiRoute = pathname.startsWith("/api");
  const isProtected =
    !isPublic &&
    !isCronApi &&
    !isTokenApi &&
    (pathname === "/" ||
      protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
      (isApiRoute && !isAuthApi));

  if (!sessionCookie && isProtected) {
    if (isApiRoute) {
      return unauthorized();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
