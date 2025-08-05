import { JWT } from "next-auth/jwt";
import { Session, Account, User } from "next-auth";
import {
  IAuthProvider,
  AUTH_PROVIDER_NAMES,
  AuthProviderName,
} from "./auth-providers";
import { AuthenticationRequest } from "../shared/auth.types";
import { authenticate } from "@/services/api";
import { AuthenticationRequestSchema } from "../shared/auth.schemas";
import Credentials from "next-auth/providers/credentials";
import { Provider } from "next-auth/providers";

const ENDATIX_AUTH_PROVIDER: AuthProviderName = AUTH_PROVIDER_NAMES.ENDATIX;

export class EndatixAuthProvider implements IAuthProvider {
  readonly name: AuthProviderName = ENDATIX_AUTH_PROVIDER;

  
  /**
   * Registers the Endatix credentials provider with the NextAuth providers array.
   *
   * @param providers - The array of NextAuth providers to register with.
   */
  public static register(providers: Provider[]): void {
    if (!providers) {
      return;
    }

    providers.push(
      Credentials({
        id: ENDATIX_AUTH_PROVIDER,
        name: ENDATIX_AUTH_PROVIDER,
        type: "credentials",
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
            const validatedFields = AuthenticationRequestSchema.safeParse({
              email: credentials.email,
              password: credentials.password,
            });

            if (!validatedFields.success) {
              console.error(
                "Invalid credentials:",
                validatedFields.error.flatten().fieldErrors,
              );
              return null;
            }

            const authRequest: AuthenticationRequest = {
              email: validatedFields.data.email,
              password: validatedFields.data.password,
            };

            const authenticationResponse = await authenticate(authRequest);

            if (!authenticationResponse) {
              console.error("Authentication failed: No response from API");
              return null;
            }

            const user: User = {
              id: authenticationResponse.email,
              email: authenticationResponse.email,
              name: authenticationResponse.email,
              accessToken: authenticationResponse.accessToken,
              refreshToken: authenticationResponse.refreshToken,
            };

            return user;
          } catch (error) {
            console.error("Authentication error:", error);
            return null;
          }
        },
      }),
    );
  }

  async handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT> {
    const { token, user, account } = params;

    if (user && account?.provider === this.name) {
      token.accessToken = user.accessToken;
      token.refreshToken = user.refreshToken;
      token.email = user.email;
      token.name = user.name || user.email;
      token.provider = this.name;
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
