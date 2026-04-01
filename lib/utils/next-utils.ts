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
