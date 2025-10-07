import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_ROUTES,
  DEFAULT_RETURN_URL,
  SIGNIN_PATH,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure/auth-constants";

export default async function middleware(req: NextRequest) {
  const session = await auth();

  if (AUTH_ROUTES.includes(req.nextUrl.pathname)) {
    console.log("AUTH_ROUTES redirect");
    return NextResponse.next();
  }

  const isLoggedIn = !!session;
  const hasSessionError = session?.error !== undefined;
  if (!isLoggedIn || hasSessionError) {
    return redirectToLogin(req);
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
  let returnUrl = req.nextUrl.pathname || DEFAULT_RETURN_URL;
  if (returnUrl === "/") {
    returnUrl = DEFAULT_RETURN_URL;
  }

  if (req.nextUrl.search) {
    returnUrl += req.nextUrl.search;
  }

  const encodedReturnUrl = encodeURIComponent(returnUrl);

  const loginUrl = new URL(
    `${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodedReturnUrl}`,
    req.nextUrl.origin,
  );

  return NextResponse.redirect(loginUrl);
}
