import { JWT } from "next-auth/jwt";
import { IAuthProvider } from "./types";

/**
 * Parameters for the federated logout.
 */
export interface FederatedLogoutParams {
  token: JWT;
  postLogoutRedirectUri: string;
}

/**
 * Interface for providers that support federated logout.
 */
export interface ISupportsFederatedLogout {
  /**
   * Resolves the federated logout URL for the provider.
   * @param params - The parameters for the federated logout.
   * @returns The federated logout URL or null if the provider does not support federated logout.
   */
  resolveFederatedLogoutUrl(params: FederatedLogoutParams): string | null;
}

/**
 * Checks if the provider supports federated logout.
 * @param provider - The provider to check.
 * @returns True if the provider supports federated logout, false otherwise.
 */
export function supportsFederatedLogout(
  provider: IAuthProvider | undefined,
): provider is IAuthProvider & ISupportsFederatedLogout {
  return (
    provider !== undefined &&
    typeof (provider as Partial<ISupportsFederatedLogout>)
      .resolveFederatedLogoutUrl === "function"
  );
}
