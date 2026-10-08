import { CookiesOptions } from "@auth/core/types";

/**
 * Auth.js `auth()` and `signOut()` assume https when the request carries no
 * `x-forwarded-proto` (`createActionURL`).
 */
const AUTHJS_DEFAULT_PROTOCOL = "https";

/** The public origin Auth.js uses: `AUTH_URL`, then the legacy `NEXTAUTH_URL`. */
export function readAuthPublicUrl(): string | undefined {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || undefined;
}

/**
 * `useSecureCookies` for the Auth.js config (`createAuthConfig`), so Auth.js
 * and Hub name the session cookie from the same value. With a public URL its
 * scheme decides, including behind a TLS terminator that forwards HTTP; an
 * invalid URL gives false. Without one it is undefined and the request decides.
 */
export function configuredSecureCookies(
  authUrl: string | undefined = readAuthPublicUrl(),
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
  const configured = configuredSecureCookies();
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

/** Auth.js `SessionStore` chunk size: the 4096-byte limit minus an empty cookie. */
const SESSION_COOKIE_CHUNK_SIZE = 4096 - 160;

/**
 * Splits a session token the way Auth.js `SessionStore` does: one cookie, or
 * `name.0`, `name.1`, ... when it exceeds the chunk size.
 */
export function sessionCookieChunks(
  name: string,
  value: string,
): { name: string; value: string }[] {
  const count = Math.ceil(value.length / SESSION_COOKIE_CHUNK_SIZE);
  if (count <= 1) {
    return [{ name, value }];
  }
  return Array.from({ length: count }, (_, index) => ({
    name: `${name}.${index}`,
    value: value.slice(
      index * SESSION_COOKIE_CHUNK_SIZE,
      (index + 1) * SESSION_COOKIE_CHUNK_SIZE,
    ),
  }));
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
