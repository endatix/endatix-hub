import { NextAuthConfig } from "next-auth";
import { AuthProviderRegistry } from "./auth-provider-registry";
import { AuthPresentation } from "./types";

/**
 * Creates NextAuth configuration from a provider registry.
 * This replaces both the auth-provider-factory and the router logic.
 */
export function createAuthConfig(
  registry: AuthProviderRegistry,
): NextAuthConfig & {
  authPresentation: AuthPresentation[];
} {
  const authProviders = registry.getActiveProviders();

  return {
    secret: process.env.AUTH_SECRET,
    authPresentation: registry.getAuthPresentationOptions(),
    providers: authProviders.map((provider) => provider.getProviderConfig()),
    callbacks: {
      jwt: async (params) => {
        const { token, user, account, trigger } = params;
        const providerId = account?.provider || token.provider;

        if (!providerId) {
          return token;
        }

        const provider = registry.getProvider(providerId);
        if (!provider) {
          console.warn(`No auth provider found for: ${providerId}`);
          return token;
        }

        return await provider.handleJWT({
          token,
          user,
          account: account || undefined,
          trigger,
        });
      },

      session: async (params) => {
        const { session, token } = params;
        const providerId = token.provider as string;

        if (!providerId) {
          console.warn("No provider ID found in token");
          return session;
        }

        const provider = registry.getProvider(providerId);
        if (!provider) {
          console.warn(`No auth provider found for: ${providerId}`);
          // Fallback for unknown providers
          session.accessToken = token.access_token as string;
          return session;
        }

        return await provider.handleSession({ session, token });
      },
    },
    pages: {
      signIn: "/signin",
      signOut: "/signout",
      error: "/auth-error",
    },
    session: {
      strategy: "jwt",
      ...(process.env.SESSION_MAX_AGE_IN_MINUTES && {
        maxAge: parseInt(process.env.SESSION_MAX_AGE_IN_MINUTES) * 60 - 10,
        updateAge: parseInt(process.env.SESSION_MAX_AGE_IN_MINUTES) * 60 - 30,
      }),
    },
    trustHost: true,
  };
}
