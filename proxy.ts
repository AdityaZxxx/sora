import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/http-error";

type RouteSegments = readonly string[];

const guestRoutes: readonly RouteSegments[] = [["sign-in"], ["sign-up"]];

const publicRoutes: readonly RouteSegments[] = [
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

function matchesRoute(pathname: string, segments: RouteSegments) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    parts.length >= segments.length &&
    segments.every((segment, index) => parts[index] === segment)
  );
}

function matchesAnyRoute(pathname: string, routes: readonly RouteSegments[]) {
  return routes.some((segments) => matchesRoute(pathname, segments));
}

function destinationAfterSignIn(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (sessionCookie && matchesAnyRoute(pathname, guestRoutes)) {
    return NextResponse.redirect(
      new URL(destinationAfterSignIn(request), request.url),
    );
  }

  if (matchesAnyRoute(pathname, publicRoutes)) {
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
