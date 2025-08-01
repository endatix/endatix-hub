import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";
import { IAuthProvider, AUTH_PROVIDER_NAMES } from "./auth-providers";

export class KeycloakAuthProvider implements IAuthProvider {
  readonly name = AUTH_PROVIDER_NAMES.KEYCLOAK;
  async handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT> {
    const { token, user, account } = params;

    if (account?.provider === this.name && account.access_token) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
      token.provider = this.name;

      // Store user information
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
    }

    return token;
  }

  async handleSession(params: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
    const { session, token } = params;

    // Pass the access token to the session
    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      name: token.name as string,
      email: token.email as string,
    };

    return session;
  }
}
