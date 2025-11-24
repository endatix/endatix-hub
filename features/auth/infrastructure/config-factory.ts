import { NextAuthConfig } from "next-auth";
import { AuthProviderRegistry } from "./auth-provider-registry";
import { AuthPresentation } from "./types";
import { invalidateUserAuthorizationCache } from "../authorization/application/authorization-data.provider";

// Safe margin in seconds to expire session before actual expiration
const SESSION_EXPIRATION_SAFE_MARGIN_SECONDS = 10;

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
        const { token, user, account, session, trigger } = params;
        const providerId = account?.provider || token.provider;

        if (!providerId) {
          return token;
        }

        const provider = registry.getProvider(providerId);
        if (!provider) {
          console.warn(`No auth provider found for: ${providerId}`);
          return token;
        }

        const userId = user?.id as string;
        if (userId) {
          invalidateUserAuthorizationCache({ userId });
        }

        const jwtToken = await provider.handleJWT({
          token,
          user,
          account: account || undefined,
          session: session || undefined,
          trigger,
        });

        if (!jwtToken?.expires_at) {
          return jwtToken;
        }

        const currentTimeSeconds = Math.floor(Date.now() / 1000);
        const expirationTimeSeconds = jwtToken.expires_at;
        const expiresWithinMargin =
          expirationTimeSeconds - SESSION_EXPIRATION_SAFE_MARGIN_SECONDS <
          currentTimeSeconds;

        return expiresWithinMargin
          ? {
              ...jwtToken,
              error: "SessionExpiredError",
            }
          : jwtToken;
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
        maxAge: parseInt(process.env.SESSION_MAX_AGE_IN_MINUTES) * 60,
        updateAge: parseInt(process.env.SESSION_MAX_AGE_IN_MINUTES) * 60,
      }),
    },
    trustHost: true,
  };
}
