import { CookiesOptions } from "@auth/core/types";

/**
 * Whether the Auth.js session cookie uses the `__Secure-` prefix.
 * AUTH_URL is the public origin the browser uses. When it is set, its scheme
 * wins over the internal request, including a TLS terminator that delivers HTTP.
 * When it is missing, the request protocol is used (direct HTTP or HTTPS).
 * An invalid AUTH_URL does not fall through to forwarded headers.
 */
export function useSecureSessionCookie(
  authUrl: string | undefined,
  requestProtocol: string | null | undefined,
): boolean {
  if (authUrl) {
    try {
      return new URL(authUrl).protocol === "https:";
    } catch {
      return false;
    }
  }
  return normalizeProtocol(requestProtocol) === "https";
}

function normalizeProtocol(value: string | null | undefined): string {
  return (value ?? "").replace(/:$/, "").split(",")[0].trim().toLowerCase();
}

export function sessionCookieName(useSecureCookies: boolean): string {
  const cookiePrefix = useSecureCookies ? "__Secure-" : "";
  return `${cookiePrefix}authjs.session-token`;
}

/**
 * Returns the session cookie options for the given secure cookies flag.
 * Replicates Auth.js `defaultCookies` for the session token.
 */

export function getSessionCookieOptions(
  useSecureCookies: boolean,
): Pick<CookiesOptions, "sessionToken"> {
  return {
    sessionToken: {
      name: sessionCookieName(useSecureCookies),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  };
}
