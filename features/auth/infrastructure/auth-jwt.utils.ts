import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { TelemetryLogger } from "@/features/telemetry";
import { secureCookieFromAuthUrl } from "./session-utils";

const LOGGER_NAME = "auth.logout";

/**
 * Gets the authentication JWT from the request headers.
 * @returns The authentication JWT or null if it is not found.
 */
export async function getAuthJwtFromRequest(): Promise<JWT | null> {
  const requestHeaders = await headers();
  const secureCookie = secureCookieFromAuthUrl();
  const token = await getToken({
    req: { headers: new Headers(requestHeaders) },
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });
  if (!token) {
    logMissingSessionCookie(secureCookie);
  }
  return token;
}

function logMissingSessionCookie(secureCookie: boolean): void {
  TelemetryLogger.warn(
    "Hub session cookie was not read",
    { secureCookie, reason: "session_cookie_missing" },
    LOGGER_NAME,
  );
}
