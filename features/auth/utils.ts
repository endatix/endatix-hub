import { DEFAULT_RETURN_URL } from "./infrastructure/auth-constants";
import { DEFAULT_BASE_PATH, withBasePath } from "@/lib/hosting/base-path";

/**
 * Normalizes the return URL to a safe relative URL.
 * @param returnUrl - The return URL to normalize.
 * @returns The normalized return URL.
 */
function normalizeReturnUrl(returnUrl: string | undefined): string {
  const trimmed = returnUrl?.trim() || DEFAULT_RETURN_URL;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_RETURN_URL;
  }

  return trimmed;
}

/**
 * Builds a safe redirect URL for authentication.
 * @param returnUrl - The return URL to build the redirect URL from.
 * @param basePath - The base path to build the redirect URL from.
 * @returns The safe redirect URL.
 */
export function toAuthRedirectUrl(
  returnUrl: string | undefined,
  basePath = DEFAULT_BASE_PATH,
): string {
  const safeReturnUrl = normalizeReturnUrl(returnUrl);
  
  return withBasePath(safeReturnUrl, basePath);
}
