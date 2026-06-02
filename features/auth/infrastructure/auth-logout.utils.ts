import type { JWT } from "next-auth/jwt";
import { authRegistry } from "./auth-provider-registry";
import { SIGNIN_PATH } from "./auth-constants";
import { supportsFederatedLogout } from "./federated-logout.types";
import { getPostLogoutRedirectUri } from "./oidc-logout.utils";

/**
 * Resolves the federated logout URL for the provider.
 * @param token - The token to resolve the federated logout URL for.
 * @returns The federated logout URL or null if the provider does not support federated logout.
 */
export function resolveFederatedLogoutUrl(token: JWT | null): string | null {
  if (!token || typeof token.provider !== "string") {
    return null;
  }

  const provider = authRegistry.getProvider(token.provider);

  if (!supportsFederatedLogout(provider)) {
    return null;
  }

  const authUrl = process.env.AUTH_URL;

  if (!authUrl) {
    console.warn("Federated logout requested but AUTH_URL is missing");
    return null;
  }

  return provider.resolveFederatedLogoutUrl({
    token,
    postLogoutRedirectUri: getPostLogoutRedirectUri(
      authUrl,
      SIGNIN_PATH,
      process.env.NEXT_PUBLIC_BASE_PATH,
    ),
  });
}
