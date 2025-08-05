import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";
import {
  IAuthProvider,
  AUTH_PROVIDER_NAMES,
  AuthProviderName,
} from "./auth-providers";
import Keycloak from "next-auth/providers/keycloak";
import { Provider } from "next-auth/providers";

const KEYCLOAK_AUTH_PROVIDER: AuthProviderName = AUTH_PROVIDER_NAMES.KEYCLOAK;

export class KeycloakAuthProvider implements IAuthProvider {
  readonly name = AUTH_PROVIDER_NAMES.KEYCLOAK;

  /**
   * Registers the Keycloak provider with the NextAuth providers array.
   *
   * @param providers - The array of NextAuth providers to register with.
   */
  public static register(providers: Provider[]): void {
    if (!providers) {
      return;
    }

    providers.push(
      Keycloak({
        id: KEYCLOAK_AUTH_PROVIDER,
        name: KEYCLOAK_AUTH_PROVIDER,
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
      }),
    );
  }

  async handleJWT({
    token,
    user,
    account,
  }: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT> {
    if (account?.provider === this.name) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
      token.provider = this.name;
    }

    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
    }

    return token;
  }

  async handleSession({
    session,
    token,
  }: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
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
