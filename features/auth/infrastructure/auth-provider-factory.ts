import { Provider } from "next-auth/providers";
import { getAuthConfig, getEnabledProviders } from "../../config/auth-config";
import { AUTH_PROVIDER_NAMES } from "./auth-providers";
import { EndatixAuthProvider } from "./endatix-auth-provider";
import { KeycloakAuthProvider } from "./keycloak-auth-provider";

export function createAuthProviders() {
  const config = getAuthConfig();
  const enabledProviders = getEnabledProviders();
  const providers: Provider[] = [];

  if (enabledProviders.includes(AUTH_PROVIDER_NAMES.ENDATIX)) {
    EndatixAuthProvider.register(providers);
  }

  if (
    enabledProviders.includes(AUTH_PROVIDER_NAMES.KEYCLOAK) &&
    config.providers.keycloak.enabled
  ) {
    KeycloakAuthProvider.register(providers);
  }

  return providers;
}

export function getAuthConfigForProvider(providerName: string) {
  const config = getAuthConfig();
  return config.providers[providerName as keyof typeof config.providers];
}
