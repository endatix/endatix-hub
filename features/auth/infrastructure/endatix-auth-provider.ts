import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";
import { IAuthProvider } from "./auth-providers";

// Extend the User type to include our custom properties
interface ExtendedUser extends User {
  accessToken?: string;
  refreshToken?: string;
}

export class EndatixAuthProvider implements IAuthProvider {
  async handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT> {
    const { token, user, account } = params;

    if (user && account?.provider === "credentials") {
      const extendedUser = user as ExtendedUser;
      token.accessToken = extendedUser.accessToken;
      token.refreshToken = extendedUser.refreshToken;
      token.email = extendedUser.email;
      token.name = extendedUser.name || extendedUser.email;
      token.provider = "credentials";
    }

    return token;
  }

  async handleSession(params: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
    const { session, token } = params;

    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      name: token.name as string,
      email: token.email as string,
    };

    return session;
  }
}
