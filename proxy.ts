import { auth } from "@/auth";
import { toSafeRelativeUrl } from "@/lib/utils/url-utils";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_ROUTES,
  DEFAULT_RETURN_URL,
  SIGNIN_PATH,
  RETURN_URL_PARAM,
  HUB_PATHS,
} from "@/features/auth/infrastructure/auth-constants";

/** Session shape needed for redirect decision; exported for testing. */
export type ProxySession = { error?: unknown } | null;

/**
 * Pure: decides if the request should redirect to login. Exported for unit tests.
 */
export function shouldRedirectToLogin(
  pathname: string,
  session: ProxySession,
): boolean {
  if (AUTH_ROUTES.includes(pathname)) {
    return false;
  }
  const isHubPath = HUB_PATHS.some((p) => pathname.startsWith(p));
  if (!isHubPath) {
    return false;
  }
  const isLoggedIn = !!session;
  const hasSessionError = session?.error !== undefined;
  return !isLoggedIn || hasSessionError;
}

export default async function proxy(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;

  if (shouldRedirectToLogin(pathname, session)) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

/*
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - .swa (Azure static web apps)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
 * - assets - all files and folders served from the public folder
 * - login - the login page
 * - create-account - the create account page
 * - ingest - the ingest proxy route for PostHog
 * - Note the the `missing: [{ type: 'header', key: 'next-action' }]` is to exclude server-actions
 */
export const config = {
  matcher: [
    {
      source:
        "/((?!api|.swa|ingest|share|slack|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};

function redirectToLogin(req: NextRequest): NextResponse<unknown> {
  const returnUrl = toSafeRelativeUrl(
    req.nextUrl.pathname,
    req.nextUrl.search,
    req.nextUrl.origin,
    DEFAULT_RETURN_URL,
  );
  const loginUrl = new URL(
    `${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}`,
    req.nextUrl.origin,
  );
  return NextResponse.redirect(loginUrl);
}
