import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import {
  IAuthProvider,
  JWTParams,
  IAuthPresentation,
  SessionParams,
} from "../types";
import Google from "next-auth/providers/google";
import { Provider } from "next-auth/providers";

export const GOOGLE_ID = "google";

export class GoogleAuthProvider implements IAuthProvider {
  readonly id = GOOGLE_ID;
  readonly name = "Google";
  readonly type = "oauth" as const;

  getProviderConfig(): Provider {
    return Google({
      id: this.id,
      name: this.name,
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    });
  }

  validateConfig(): boolean {
    const isEnabled = process.env.AUTH_GOOGLE_ENABLED === "true";

    if (!isEnabled) {
      return false;
    }

    if (!process.env.AUTH_GOOGLE_CLIENT_ID) {
      console.warn(
        "Google auth is enabled but you must set the AUTH_GOOGLE_CLIENT_ID environment variable",
      );
      return false;
    }

    if (!process.env.AUTH_GOOGLE_CLIENT_SECRET) {
      console.warn(
        "Google auth is enabled but you must set the AUTH_GOOGLE_CLIENT_SECRET environment variable",
      );
      return false;
    }

    return true;
  }

  getPresentationOptions(): IAuthPresentation {
    return {
      displayName: this.name,
      signInLabel: "Sign in with Google",
    };
  }

  async handleJWT(params: JWTParams): Promise<JWT> {
    const { token, user, account } = params;

    if (account?.provider === this.id) {
      token.access_token = account.id_token as string;
      token.refresh_token = account.refresh_token as string;
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

    session.accessToken = token.access_token as string;
    session.user = {
      ...session.user,
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
    };

    return session;
  }
}
