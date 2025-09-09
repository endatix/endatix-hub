import { JWT } from "next-auth/jwt";
import { AuthError, CredentialsSignin, Session } from "next-auth";
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
          return {
            id: signInResult.data.email,
            email: signInResult.data.email,
            name: signInResult.data.email,
            accessToken: signInResult.data.accessToken,
            refreshToken: signInResult.data.refreshToken,
          };
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

  getPresentationOptions(): IAuthPresentation {
    return {
      displayName: this.name,
      signInLabel: "Sign in with email",
    };
  }
}
