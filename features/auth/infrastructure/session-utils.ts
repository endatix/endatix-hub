import { CookiesOptions } from "@auth/core/types";

/**
 * Auth.js prefixes the session cookie with `__Secure-` only for HTTPS.
 * Behind a TLS-terminating proxy the internal request is HTTP, so the
 * public origin in AUTH_URL is the scheme that matches the browser cookie.
 * A missing or invalid AUTH_URL stays non-secure so local HTTP keeps working.
 */
export function secureCookieFromAuthUrl(
  authUrl: string | undefined = process.env.AUTH_URL,
): boolean {
  if (!authUrl) {
    return false;
  }
  try {
    return new URL(authUrl).protocol === "https:";
  } catch {
    return false;
  }
}

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
