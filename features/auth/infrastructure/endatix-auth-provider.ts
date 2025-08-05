import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { IAuthProvider, JWTParams, SessionParams } from "./types";
import { AuthenticationRequest } from "../shared/auth.types";
import { authenticate } from "@/services/api";
import { AuthenticationRequestSchema } from "../shared/auth.schemas";
import Credentials from "next-auth/providers/credentials";
import { Provider } from "next-auth/providers";

export const ENDATIX_ID = "endatix";

export class EndatixAuthProvider implements IAuthProvider {
  readonly id = ENDATIX_ID;
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
          type: "text",
          placeholder: "john.doe@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const validatedFields = AuthenticationRequestSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
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

          return {
            id: authenticationResponse.email,
            email: authenticationResponse.email,
            name: authenticationResponse.email,
            accessToken: authenticationResponse.accessToken,
            refreshToken: authenticationResponse.refreshToken,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    });
  }

  validateConfig(): boolean {
    // Endatix provider is always available since it's built-in
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
}
