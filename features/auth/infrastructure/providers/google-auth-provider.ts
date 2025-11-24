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
    const { token, user, trigger, account, session } = params;

    if (user && account?.provider === this.id) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
      token.provider = this.id;
      token.access_token = account.id_token as string;
      token.refresh_token = account.refresh_token as string;
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
