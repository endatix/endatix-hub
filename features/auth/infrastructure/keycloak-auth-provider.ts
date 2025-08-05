import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { IAuthProvider, JWTParams, SessionParams } from "./types";
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
      clientId: process.env.KEYCLOAK_CLIENT_ID || "",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
      issuer: process.env.KEYCLOAK_ISSUER,
      authorization: {
        url: process.env.KEYCLOAK_AUTHORIZATION_URL,
        params: {
          scope: process.env.KEYCLOAK_SCOPE || "openid email profile",
        },
      },
      token: {
        url: process.env.KEYCLOAK_TOKEN_URL,
      },
      userinfo: {
        url: process.env.KEYCLOAK_USERINFO_URL,
      },
    });
  }

  validateConfig(): boolean {
    // Check if Keycloak is enabled and has required configuration
    const isEnabled = process.env.KEYCLOAK_ENABLED === "true";
    const hasRequiredConfig = !!(
      process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET
    );

    if (isEnabled && !hasRequiredConfig) {
      console.warn(
        "Keycloak is enabled but missing required configuration (clientId, clientSecret)",
      );
      return false;
    }

    return isEnabled;
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
