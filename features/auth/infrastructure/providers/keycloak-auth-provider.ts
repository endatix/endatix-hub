import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import {
  IAuthProvider,
  JWTParams,
  IAuthPresentation,
  SessionParams,
} from "../types";
import Keycloak from "next-auth/providers/keycloak";
import { Provider } from "next-auth/providers";

export const KEYCLOAK_ID = "keycloak";

export class KeycloakAuthProvider implements IAuthProvider {
  readonly id = KEYCLOAK_ID;
  readonly name = "Keycloak";
  readonly type = "oidc" as const;

  getProviderConfig(): Provider {
    return Keycloak({
      id: this.id,
      name: this.name,
      clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID || "",
      clientSecret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET || "",
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    });
  }

  validateConfig(): boolean {
    // Check if Keycloak is enabled and has required configuration
    const isEnabled = process.env.AUTH_KEYCLOAK_ENABLED === "true";

    if (!isEnabled) {
      return false;
    }

    const hasRequiredConfig = !!(
      process.env.AUTH_KEYCLOAK_CLIENT_ID &&
      process.env.AUTH_KEYCLOAK_CLIENT_SECRET &&
      process.env.AUTH_KEYCLOAK_ISSUER
    );

    if (!hasRequiredConfig) {
      console.warn(
        "Keycloak is enabled but missing required configuration (clientId, clientSecret, issuer)",
      );
      return false;
    }

    return true;
  }

  getPresentationOptions(): IAuthPresentation {
    return {
      displayName: this.name,
      signInLabel: "Sign in with Keycloak",
    };
  }

  async handleJWT(params: JWTParams): Promise<JWT> {
    const { token, user, account, session, trigger } = params;

    if (user && account?.provider === this.id) {
      token.id = account.providerAccountId;
      token.email = user.email;
      token.name = user.name;
      token.provider = this.id;
      token.access_token = account.access_token;
      token.refresh_token = account.refresh_token;
      token.expires_at = account.expires_at;

      return token;
    }

    if (trigger === "update") {
      return {
        ...token,
        access_token: session?.accessToken,
        refresh_token: session?.refreshToken,
        expires_at: session?.expiresAt,
      };
    }

    const isExpired = token?.expires_at && token.expires_at < Date.now() / 1000;
    if (isExpired) {
      return {
        ...token,
        error: "SessionExpiredError",
      };
    }

    return token;
  }

  async handleSession(params: SessionParams): Promise<Session> {
    const { session, token } = params;

    session.user = {
      ...session.user,
      id: token.id as string,
    };

    session.provider = token.provider as string;
    session.accessToken = token.access_token as string;
    session.refreshToken = token.refresh_token as string;
    session.expiresAt = token.expires_at as number;

    if (token.error) {
      session.error = token.error;
    }

    return session;
  }
}
