import { auth } from "@/auth";
import { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";
import {
  AUTH_ROUTES,
  DEFAULT_RETURN_URL,
  LOGIN_PATH,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure/auth-constants";

export default auth((req: NextAuthRequest) => {
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !AUTH_ROUTES.includes(req.nextUrl.pathname)) {
    let returnUrl = req.nextUrl.pathname || DEFAULT_RETURN_URL;
    if (returnUrl === "/") {
      returnUrl = DEFAULT_RETURN_URL;
    }

    if (req.nextUrl.search) {
      returnUrl += req.nextUrl.search;
    }

    const encodedReturnUrl = encodeURIComponent(returnUrl);

    const loginUrl = new URL(
      `${LOGIN_PATH}?${RETURN_URL_PARAM}=${encodedReturnUrl}`,
      req.nextUrl.origin,
    );

    return NextResponse.redirect(loginUrl);
  }
});

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
        "/((?!api|.swa|ingest|share|slack|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
