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
 * A search-param value as Next.js delivers it when the key is present.
 * Use this on optional interface members; use `SearchParam` for a value that
 * may itself be absent.
 * https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
 */
export type SearchParamValue = string | string[];

/** A search-param value that may be absent. */
export type SearchParam = SearchParamValue | undefined;

/**
 * Reads the single value of a search parameter, taking the first when Next.js
 * delivers a repeated key as an array.
 */
export function firstSearchParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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
