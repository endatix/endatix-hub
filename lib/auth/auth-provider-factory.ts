import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import { getAuthConfig, getEnabledProviders } from "./auth-config";
import { authenticate } from "../../services/api";
import {
  AuthenticationRequest,
  AuthenticationRequestSchema,
} from "../../features/auth";

export function createAuthProviders() {
  const config = getAuthConfig();
  const enabledProviders = getEnabledProviders();
  const providers: Array<
    ReturnType<typeof Credentials> | ReturnType<typeof Keycloak>
  > = [];

  // Always add credentials provider as fallback
  if (enabledProviders.includes("credentials")) {
    providers.push(
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
    );
  }

  // Add Keycloak provider if enabled and configured
  if (
    enabledProviders.includes("keycloak") &&
    config.providers.keycloak.enabled
  ) {
    const keycloakConfig = config.providers.keycloak;

    if (!keycloakConfig.clientId || !keycloakConfig.clientSecret) {
      console.warn(
        "Keycloak is enabled but missing required configuration (clientId, clientSecret)",
      );
    } else {
      providers.push(
        Keycloak({
          clientId: keycloakConfig.clientId,
          clientSecret: keycloakConfig.clientSecret,
          issuer: keycloakConfig.issuer,
          authorization: {
            params: {
              scope: keycloakConfig.scope || "openid email profile",
            },
          },
        }),
      );
    }
  }

  return providers;
}

export function getAuthConfigForProvider(providerName: string) {
  const config = getAuthConfig();
  return config.providers[providerName as keyof typeof config.providers];
}
