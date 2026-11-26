import { DEFAULT_RETURN_URL } from "@/features/auth/infrastructure/auth-constants";
import { readAuthPublicUrl } from "@/features/auth/infrastructure/session-utils";

/** Auth.js uses callbackUrl; Hub navigation supplies an app-relative returnUrl. */
export function signinDestination(params: { returnUrl?: string; callbackUrl?: string }) {
  if (params.returnUrl !== undefined) return typeof params.returnUrl === "string" ? params.returnUrl : DEFAULT_RETURN_URL;
  if (params.callbackUrl === undefined) return undefined;
  return callbackDestination(params.callbackUrl);
}

function callbackDestination(callback: unknown) {
  if (typeof callback !== "string") return DEFAULT_RETURN_URL;
  const origin = URL.parse(readAuthPublicUrl() ?? "")?.origin;
  const relative = callback.startsWith("/");
  if (!relative && !origin) return DEFAULT_RETURN_URL;
  const base = origin ?? "https://workspace.invalid";
  const url = URL.parse(callback, base);
  if (!url || url.origin !== base || url.pathname.startsWith("//")) return DEFAULT_RETURN_URL;
  return url.pathname + url.search + url.hash;
}
