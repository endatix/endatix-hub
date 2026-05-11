import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export const OS_MACOS_CLASS = "os-macos";

const MAC_OS_USER_AGENTS_REGEX = /Macintosh|Mac OS X|iPhone|iPad|iPod/i;
/**
 * Get the operating system class from the user agent
 * @param headers - The headers object
 * @returns The operating system class
 */
export function getOsClass(headers: ReadonlyHeaders) {
  const ua = headers.get("user-agent") ?? "";
  return MAC_OS_USER_AGENTS_REGEX.test(ua) ? OS_MACOS_CLASS : "";
}

/**
 * The type of a search parameter follow Next.js searchParams type.
 * https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
 */
export type SearchParam = string | string[] | undefined;

/**
 * Checks if a search parameter has a value.
 * @param param - The search parameter.
 * @param value - The value to check.
 * @returns true if the search parameter has the value, false otherwise.
 */
export function hasValue(param: SearchParam, value: string): boolean {
  if (param === undefined || typeof value !== "string" || value.trim() === "") {
    return false;
  }

  if (typeof param === "string") {
    return param === value;
  }

  if (Array.isArray(param)) {
    return param.includes(value);
  }

  return false;
}
