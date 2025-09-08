import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import {
  IAuthProvider,
  JWTParams,
  PresentationOptions,
  SessionParams,
} from "../types";
import Credentials from "next-auth/providers/credentials";
import { Provider } from "next-auth/providers";
import { ApiResult, SignInRequestSchema } from "@/lib/endatix-api/types";
import { EndatixApi } from "@/lib/endatix-api";

export const ENDATIX_ID = "endatix";

export class EndatixAuthProvider implements IAuthProvider {
  readonly id = ENDATIX_ID;
  readonly name = "Endatix";
  readonly type = "credentials" as const;
  readonly isSystemDefined = true;

  getProviderConfig(): Provider {
    return Credentials({
      id: this.id,
      name: this.name,
      type: this.type,
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "john.doe@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const validatedData = SignInRequestSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
          });

          if (!validatedData.success) {
            console.error(
              "Invalid credentials:",
              validatedData.error.flatten().fieldErrors,
            );
            return null;
          }

          const endatix = new EndatixApi();
          const signInResult = await endatix.auth.signIn(validatedData.data);

          if (ApiResult.isError(signInResult)) {
            return null;
          }

          return {
            id: signInResult.data.email,
            email: signInResult.data.email,
            name: signInResult.data.email,
            accessToken: signInResult.data.accessToken,
            refreshToken: signInResult.data.refreshToken,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    });
  }

  validateConfig(): boolean {
    return true;
  }

  async handleJWT(params: JWTParams): Promise<JWT> {
    const { token, user, account } = params;

    if (user && account?.provider === this.id) {
      token.accessToken = user.accessToken;
      token.refreshToken = user.refreshToken;
      token.email = user.email;
      token.name = user.name || user.email;
      token.provider = this.id;
    }

    return token;
  }

  async handleSession(params: SessionParams): Promise<Session> {
    const { session, token } = params;

    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      name: token.name as string,
      email: token.email as string,
    };

    return session;
  }

  getPresentationOptions(): PresentationOptions {
    return {
      displayName: this.name,
      signInLabel: "Sign in with Email",
    };
  }
}
