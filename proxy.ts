import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/http-error";
import { safeNext } from "@/lib/safe-next";

const guestRoutes = [["sign-in"]];

const publicRoutes = [
  ...guestRoutes,
  ["sign-up"],
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

function matchesRoute(pathname: string, segments: readonly string[]) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    parts.length >= segments.length &&
    segments.every((segment, index) => parts[index] === segment)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (
    sessionCookie &&
    guestRoutes.some((segments) => matchesRoute(pathname, segments))
  ) {
    return NextResponse.redirect(
      new URL(
        safeNext(request.nextUrl.searchParams.get("next")) ?? "/",
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
