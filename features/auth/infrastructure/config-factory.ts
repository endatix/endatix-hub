import { NextAuthConfig } from "next-auth";
import { AuthProviderRegistry } from "./registry";

/**
 * Creates NextAuth configuration from a provider registry.
 * This replaces both the auth-provider-factory and the router logic.
 */
export function createAuthConfig(
  registry: AuthProviderRegistry,
): Pick<NextAuthConfig, "providers" | "callbacks"> {
  const enabledProviders = registry.getEnabledProviders();

  return {
    providers: enabledProviders.map((provider) => provider.getProviderConfig()),
    callbacks: {
      async jwt(params) {
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

      async session(params) {
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
          session.accessToken = token.accessToken as string;
          return session;
        }

        return await provider.handleSession({ session, token });
      },
    },
  };
}
