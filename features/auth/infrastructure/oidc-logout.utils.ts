import { withBasePath } from "@/lib/hosting/base-path";
import { SIGNIN_PATH } from "./auth-constants";

/**
 * Parameters for the OIDC end session logout.
 */
export interface OidcEndSessionLogoutParams {
  endSessionEndpoint: string;
  idToken: string;
  postLogoutRedirectUri: string;
  clientId?: string;
}

/**
 * Builds the OIDC end session logout URL.
 * @param params - The parameters for the OIDC end session logout.
 * @returns The OIDC end session logout URL.
 */
export function buildOidcEndSessionLogoutUrl({
  endSessionEndpoint,
  idToken,
  postLogoutRedirectUri,
  clientId,
}: OidcEndSessionLogoutParams): string {
  const logoutUrl = new URL(endSessionEndpoint);

  if (clientId) {
    logoutUrl.searchParams.set("client_id", clientId);
  }

  logoutUrl.searchParams.set("id_token_hint", idToken);
  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

  return logoutUrl.toString();
}

/**
 * Builds the post logout redirect URI for the OIDC end session logout.
 * @param authUrl - The URL of the authentication server.
 * @param signInPath - The path to the sign-in page.
 * @param basePath - The base path of the application.
 * @returns The post logout redirect URI.
 */
export function getPostLogoutRedirectUri(
  authUrl: string,
  signInPath: string = SIGNIN_PATH,
  basePath = "",
): string {
  const redirectUri = withBasePath(signInPath, basePath);
  return new URL(redirectUri, authUrl).toString();
}
