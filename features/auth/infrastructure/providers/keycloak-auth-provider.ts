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
    const { token, user, account } = params;

    if (account?.provider === this.id) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
      token.provider = this.id;
    }

    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
    }

    return token;
  }

  async handleSession(params: SessionParams): Promise<Session> {
    const { session, token } = params;

    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
    };

    return session;
  }
}
