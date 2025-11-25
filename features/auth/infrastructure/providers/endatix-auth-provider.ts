import { JWT } from "next-auth/jwt";
import { AuthError, CredentialsSignin, Session, User } from "next-auth";
import {
  IAuthProvider,
  JWTParams,
  IAuthPresentation,
  SessionParams,
} from "../types";
import Credentials from "next-auth/providers/credentials";
import { Provider } from "next-auth/providers";
import {
  ApiResult,
  isNetworkError,
  isServerError,
  isValidationError,
  SignInRequestSchema,
} from "@/lib/endatix-api/types";
import { EndatixApi } from "@/lib/endatix-api";
import { ZodError } from "zod";
import { decodeJwt } from "jose";
import { EndatixJwtPayload } from "../jwt.types";
import { JWTInvalid } from "jose/errors";

export const ENDATIX_AUTH_PROVIDER_ID = "endatix";

export class InvalidCredentialsError extends CredentialsSignin {
  static type = "InvalidCredentials";
  code = "Invalid identifier or password";
  cause = {
    message: "The supplied credentials are invalid",
  };
}

export class InvalidInputError extends ZodError {
  static type = "InvalidInput";
  code = "Invalid input data";
}

export class TokenExpiredError extends AuthError {
  static type = "TokenExpired";
  code = "Token expired";
  cause = {
    message: "The token has expired",
  };
}

export class NetworkError extends AuthError {
  static type = "Network";
  code = "Network error";
  cause = {
    message: "Network error. Failed to connect to the Endatix API.",
  };
}

export class ServerError extends AuthError {
  static type = "Server";
  code = "Server error";
  cause = {
    message: "An error occurred while processing the request",
  };
}

export class UnknownError extends AuthError {
  static type = "Unknown";
  code = "Unknown error";
  cause = {
    message: "An unknown error occurred",
  };
}

export class EndatixAuthProvider implements IAuthProvider {
  readonly id = ENDATIX_AUTH_PROVIDER_ID;
  readonly name = "Endatix";
  readonly type = "credentials" as const;

  getProviderConfig(): Provider {
    return Credentials({
      id: this.id,
      name: this.name,
      type: this.type,
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "john.doe@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const validatedData = await SignInRequestSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });

        if (!validatedData.success) {
          throw new InvalidInputError(validatedData.error.issues);
        }

        const endatix = new EndatixApi();
        const signInResult = await endatix.auth.signIn(validatedData.data);

        if (ApiResult.isSuccess(signInResult)) {
          try {
            const jwtPayload = decodeJwt<EndatixJwtPayload>(
              signInResult.data.accessToken,
            );

            return {
              id: jwtPayload.sub,
              email: signInResult.data.email,
              name: signInResult.data.email,
              accessToken: signInResult.data.accessToken,
              refreshToken: signInResult.data.refreshToken,
              expiresAt: jwtPayload.exp || Date.now() / 1000,
            };
          } catch (error: unknown) {
            if (error instanceof JWTInvalid) {
              throw new ServerError("Invalid access token");
            }

            throw new ServerError("Failed to decode access token");
          }
        }

        if (isValidationError(signInResult)) {
          throw new InvalidCredentialsError();
        }

        if (isServerError(signInResult)) {
          throw new ServerError();
        }

        if (isNetworkError(signInResult)) {
          throw new NetworkError();
        }

        throw new UnknownError();
      },
    });
  }

  validateConfig(): boolean {
    return true;
  }

  async handleJWT(params: JWTParams): Promise<JWT> {
    const { token, user, account, session, trigger } = params;

    const userData = user as User & {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };

    if (user && account?.provider === this.id) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name || user.email;
      token.provider = this.id;
      token.access_token = userData.accessToken;
      token.refresh_token = userData.refreshToken;
      token.expires_at = userData.expiresAt;

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
    }

    session.provider = token.provider as string;
    session.accessToken = token.access_token as string;
    session.refreshToken = token.refresh_token as string;
    session.expiresAt = token.expires_at as number;

    if (token.error) {
      session.error = token.error;
    }

    return session;
  }

  getPresentationOptions(): IAuthPresentation {
    return {
      displayName: this.name,
      signInLabel: "Sign in with email",
    };
  }
}
