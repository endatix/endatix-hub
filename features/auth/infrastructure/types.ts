import { JWT } from "next-auth/jwt";
import { Session, Account, User } from "next-auth";
import { Provider } from "next-auth/providers";

export interface JWTParams {
  token: JWT;
  user?: User;
  account?: Account;
  trigger?: "signIn" | "signUp" | "update";
}

export interface SessionParams {
  session: Session;
  token: JWT;
}

/**
 * Enhanced auth provider interface that supports any string ID for custom providers
 * and provides a clean separation between NextAuth config and callback handling.
 */
export interface IAuthProvider {
  /** Unique identifier for the provider (can be any string) */
  readonly id: string;

  /** Display name for the provider */
  readonly name: string;

  /** Provider type - matches NextAuth provider types */
  readonly type: "credentials" | "oauth" | "oidc" | "email";

  /**
   * Returns the NextAuth provider configuration.
   * This replaces the static register() methods.
   */
  getProviderConfig(): Provider;

  /**
   * Handles JWT token processing during authentication callbacks.
   */
  handleJWT(params: JWTParams): Promise<JWT>;

  /**
   * Handles session data processing.
   */
  handleSession(params: SessionParams): Promise<Session>;

  /**
   * Optional validation to check if provider is properly configured.
   * Used to determine if provider should be enabled.
   */
  validateConfig?(): boolean;
}
