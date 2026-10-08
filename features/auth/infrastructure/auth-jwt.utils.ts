import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { TelemetryLogger } from "@/features/telemetry";
import { LOGOUT_LOGGER_NAME } from "./auth-constants";
import {
  sessionCookieName,
  shouldUseSecureSessionCookie,
} from "./session-utils";

/**
 * Gets the authentication JWT from the request headers.
 * @returns The authentication JWT or null if not found.
 */
export async function getAuthJwtFromRequest(): Promise<JWT | null> {
  const requestHeaders = await headers();
  const secureCookie = shouldUseSecureSessionCookie(requestHeaders);
  const token = await getToken({
    req: { headers: new Headers(requestHeaders) },
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });
  if (!token) {
    logUnreadSessionCookie(secureCookie, requestHeaders.get("cookie"));
  }
  return token;
}

function logUnreadSessionCookie(
  secureCookie: boolean,
  cookieHeader: string | null,
): void {
  const reason = hasSessionCookie(cookieHeader, sessionCookieName(secureCookie))
    ? "session_token_invalid"
    : "session_cookie_missing";
  TelemetryLogger.warn(
    "Hub session cookie was not read",
    { secureCookie, reason },
    LOGOUT_LOGGER_NAME,
  );
}

/** True when the cookie, or its first Auth.js chunk (`name.0`), is present. */
function hasSessionCookie(cookieHeader: string | null, name: string): boolean {
  return (cookieHeader ?? "")
    .split(";")
    .map((pair) => pair.trim().split("=")[0])
    .some((cookie) => cookie === name || cookie === `${name}.0`);
}
