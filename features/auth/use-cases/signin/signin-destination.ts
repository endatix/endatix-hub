import { DEFAULT_RETURN_URL } from "@/features/auth/infrastructure/auth-constants";
import { toSafeRelativeUrl } from "@/lib/utils/url-utils";

/** Auth.js uses callbackUrl; Hub navigation supplies an app-relative returnUrl. */
export function signinDestination(params: { returnUrl?: string; callbackUrl?: string }) {
  if (params.returnUrl !== undefined) return params.returnUrl;
  if (params.callbackUrl === undefined) return undefined;
  const origin = URL.parse(process.env.AUTH_URL ?? "")?.origin;
  if (!origin) return DEFAULT_RETURN_URL;
  return toSafeRelativeUrl(params.callbackUrl, "", origin, DEFAULT_RETURN_URL);
}
