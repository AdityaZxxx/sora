import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/http-error";
import { edgeRedirectRoutes, guestRoutes, matchesRoute } from "@/lib/routes";
import { safeNext } from "@/lib/safe-next";

const publicRoutes = [
  ...guestRoutes,
  ["invite"],
  ["privacy"],
  ["api", "auth"],
  ["api", "cron"],
  ["api", "mcp"],
  ["manifest.json"],
  ["robots.txt"],
  ["sitemap.xml"],
  ["opengraph-image"],
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (
    sessionCookie &&
    edgeRedirectRoutes.some((segments) => matchesRoute(pathname, segments))
  ) {
    return NextResponse.redirect(
      new URL(
        safeNext(request.nextUrl.searchParams.get("next"), guestRoutes) ?? "/",
        request.url,
      ),
    );
  }

  if (publicRoutes.some((segments) => matchesRoute(pathname, segments))) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    if (matchesRoute(pathname, ["api"])) {
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
