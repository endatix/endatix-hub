import { CookiesOptions } from "@auth/core/types";
/**
 * Returns the session cookie options for the given secure cookies flag.
 * @param useSecureCookies - Whether to use secure cookies.
 * Note: This is replicating the internals from https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/lib/utils/cookie.ts
 * @returns The session cookie options.
 */
export function getSessionCookieOptions(
  useSecureCookies: boolean,
): Pick<CookiesOptions, "sessionToken"> {
  const cookiePrefix = useSecureCookies ? "__Secure-" : "";
  return {
    sessionToken: {
      name: `${cookiePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  };
}
