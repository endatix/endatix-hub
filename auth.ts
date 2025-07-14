import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "./services/api";
import {
  AuthenticationRequest,
  AuthenticationRequestSchema,
} from "./features/auth";
import {
  AuthProviderRouter,
  CredentialsAuthProvider,
  KeycloakAuthProvider,
} from "./features/auth/infrastructure";

const authRouter = new AuthProviderRouter();
authRouter.registerProvider("credentials", new CredentialsAuthProvider());
authRouter.registerProvider("keycloak", new KeycloakAuthProvider());

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      authorization: {
        params: {
          scope: "openid email",
        },
      },
    }),
    Credentials({
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

          // Authenticate against the Endatix API
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
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      const provider = account?.provider || (token.provider as string);

      if (provider && authRouter.hasProvider(provider)) {
        const authProvider = authRouter.getProvider(provider);
        return await authProvider.handleJWT({
          token,
          user,
          account: account || undefined,
          trigger,
        });
      }

      console.warn(`No auth provider found for: ${provider}`);
      return token;
    },
    async session({ session, token }) {
      const provider = token.provider as string;

      if (provider && authRouter.hasProvider(provider)) {
        const authProvider = authRouter.getProvider(provider);
        return await authProvider.handleSession({ session, token });
      }

      // Fallback for unknown providers
      console.warn(`No auth provider found for: ${provider}`);
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
  }
}
