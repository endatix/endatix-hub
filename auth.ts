import NextAuth from "next-auth";
import { createAuthProviders } from "./lib/auth/auth-provider-factory";
import {
  AuthProviderRouter,
  EndatixAuthProvider,
  KeycloakAuthProvider,
} from "./features/auth/infrastructure";

const authRouter = new AuthProviderRouter();
authRouter.registerProvider("credentials", new EndatixAuthProvider());
authRouter.registerProvider("keycloak", new KeycloakAuthProvider());

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: createAuthProviders(),
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
