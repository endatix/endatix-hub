import { DEFAULT_RETURN_URL } from "@/features/auth/infrastructure/auth-constants";

/** Auth.js uses callbackUrl; Hub navigation supplies an app-relative returnUrl. */
export function signinDestination(params: { returnUrl?: string; callbackUrl?: string }, origin?: string) {
  if (params.returnUrl !== undefined) return typeof params.returnUrl === "string" ? params.returnUrl : DEFAULT_RETURN_URL;
  if (params.callbackUrl === undefined) return undefined;
  return callbackDestination(params.callbackUrl, origin);
}

function callbackDestination(callback: unknown, origin?: string) {
  if (typeof callback !== "string") return DEFAULT_RETURN_URL;
  if (!origin && !/^\/(?![\\/])/.test(callback)) return DEFAULT_RETURN_URL;
  const base = origin ?? "https://workspace.invalid";
  const url = URL.parse(callback, base);
  if (!url || url.origin !== base || url.pathname.startsWith("//")) return DEFAULT_RETURN_URL;
  return url.pathname + url.search + url.hash;
}
