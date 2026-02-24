import { cookies } from "next/headers";

/**
 * Minimal cookie store interface for reading a single cookie value.
 * Accepts Next.js ReadonlyRequestCookies or a test double.
 */
export type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

export type GetCookieValueOptions = {
  /** When provided, used to read the cookie; when omitted, resolved via next/headers cookies() (server only). */
  cookieStore?: CookieStoreLike;
};

/**
 * Returns the value of the cookie with the given name, or undefined if missing.
 * Pass cookieStore in options for testability; omit in server components to use Next cookies().
 */
export async function getValue(
  name: string,
  options?: GetCookieValueOptions,
): Promise<string | undefined> {
  const cookieStore = options?.cookieStore ?? (await cookies());
  return cookieStore.get(name)?.value;
}
