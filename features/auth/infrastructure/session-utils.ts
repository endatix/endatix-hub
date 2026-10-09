import { CookiesOptions } from "@auth/core/types";

/**
 * Auth.js `auth()` and `signOut()` assume https when the request carries no
 * `x-forwarded-proto` (`createActionURL`).
 */
const AUTHJS_DEFAULT_PROTOCOL = "https";

/**
 * The public origin (`AUTH_URL`). Hub never supported the legacy NextAuth v4
 * `NEXTAUTH_URL`, so it is not read here.
 */
export function readAuthPublicUrl(): string | undefined {
  return process.env.AUTH_URL || undefined;
}

/**
 * `useSecureCookies` for the Auth.js config (`createAuthConfig`), so Auth.js
 * and Hub name the session cookie from the same value. With a public URL its
 * scheme decides, including behind a TLS terminator that forwards HTTP; an
 * invalid URL gives false. Without one it is undefined and the request decides.
 */
export function configuredSecureCookies(
  authUrl: string | undefined,
): boolean | undefined {
  if (!authUrl) {
    return undefined;
  }
  try {
    return new URL(authUrl).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Whether the session cookie for this request uses the `__Secure-` prefix:
 * the configured value, or, without a public URL, the first `x-forwarded-proto`
 * value (https when missing), which is what Auth.js `auth()` and `signOut()` use.
 */
export function shouldUseSecureSessionCookie(requestHeaders: Headers): boolean {
  const configured = configuredSecureCookies(readAuthPublicUrl());
  if (configured !== undefined) {
    return configured;
  }
  const forwarded =
    requestHeaders.get("x-forwarded-proto") ?? AUTHJS_DEFAULT_PROTOCOL;
  return normalizeProtocol(forwarded) === "https";
}

function normalizeProtocol(value: string): string {
  return value.replace(/:$/, "").split(",")[0].trim().toLowerCase();
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
