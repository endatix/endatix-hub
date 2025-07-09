export { auth as middleware } from "@/auth";

// export async function middleware(request: NextRequest) {
//   const currentSession = await getSession();

//   if (!currentSession.isLoggedIn) {
//     const requestedPath = request.nextUrl.pathname;
//     console.debug(
//       `Redirecting to login from originally requested path: ${requestedPath}`,
//     );

//     return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
//   }
// }

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
 * - account-verification - the account verification page
 * - verify-email - the email verification page
 * - Note the the `missing: [{ type: 'header', key: 'next-action' }]` is to exclude server-actions
 */
export const config = {
  matcher: [
    {
      source:
        "/((?!api|.swa|ingest|share|slack|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|create-account|account-verification|verify-email).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
