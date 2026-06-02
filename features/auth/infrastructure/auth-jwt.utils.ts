import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";

/**
 * Gets the authentication JWT from the request headers.
 * @returns The authentication JWT or null if it is not found.
 */
export async function getAuthJwtFromRequest(): Promise<JWT | null> {
  const requestHeaders = await headers();

  return getToken({
    req: { headers: new Headers(requestHeaders) },
    secret: process.env.AUTH_SECRET,
  });
}
