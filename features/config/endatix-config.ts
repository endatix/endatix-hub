import type { NextConfig } from "next";
import { getAuthConfig, EndatixAuthConfig } from "./auth-config";
import { getApiConfig } from "./api-config";
import { StorageConfigClient } from "../asset-storage/infrastructure/storage-config-client";

export interface EndatixConfig {
  auth?: {
    providers?: {
      credentials?: {
        enabled?: boolean;
      };
      keycloak?: {
        enabled?: boolean;
        clientId?: string;
        clientSecret?: string;
        issuer?: string;
      };
    };
    session?: {
      secret?: string;
      maxAge?: number;
    };
  };
  api?: {
    baseUrl?: string;
    prefix?: string;
  };
  storage?: StorageConfigClient;
  experimental?: {
    extensions?: boolean;
  };
}

export interface WithEndatixOptions {
  auth?: EndatixConfig["auth"];
  api?: EndatixConfig["api"];
  experimental?: EndatixConfig["experimental"];
}

/**
 * @param {import('next').NextConfig} nextConfig
 * @param {WithEndatixOptions} [options] - Optional Endatix configuration
 * @returns {import('next').NextConfig}
 */
export const withEndatix = (
  nextConfig: NextConfig = {},
  options: WithEndatixOptions = {},
) => {
  // Merge environment-based config with provided options
  const baseAuthConfig = getAuthConfig();

  const mergedAuthConfig: EndatixAuthConfig = {
    providers: {
      endatix: {
        ...baseAuthConfig.providers.endatix,
        ...options.auth?.providers?.credentials,
      },
      keycloak: {
        ...baseAuthConfig.providers.keycloak,
        ...options.auth?.providers?.keycloak,
      },
    },
    session: {
      ...baseAuthConfig.session,
      ...options.auth?.session,
    },
  };

  const apiConfig = getApiConfig();

  // Set environment variables for auth configuration
  const env = {
    ...nextConfig.env,
    ...(apiConfig && { ENDATIX_API_URL: apiConfig.apiUrl }),
    // Keycloak configuration
    AUTH_KEYCLOAK_ENABLED:
      mergedAuthConfig.providers.keycloak.enabled.toString(),
    AUTH_KEYCLOAK_CLIENT_ID: mergedAuthConfig.providers.keycloak.clientId,
    AUTH_KEYCLOAK_CLIENT_SECRET:
      mergedAuthConfig.providers.keycloak.clientSecret,
    AUTH_KEYCLOAK_ISSUER: mergedAuthConfig.providers.keycloak.issuer,

    // Session configuration
    SESSION_SECRET: mergedAuthConfig.session.secret,
    SESSION_MAX_AGE_IN_MINUTES: mergedAuthConfig.session.maxAge.toString(),

    // Experimental features
    ENDATIX_ENABLE_EXTENSIONS: (
      options.experimental?.extensions ?? false
    ).toString(),
  };

  // Log experimental features status
  if (process.env.NODE_ENV !== "test") {
    // Prevent duplicate logging across main process and workers using process.env because it is inherited by child processes (Next.js workers)
    if (!process.env.__ENDATIX_LOGGED) {
      const experiments = [
        {
          name: "extensions",
          enabled: options.experimental?.extensions ?? true,
        },
      ];

      const hasExperiments = experiments.some((e) => e.enabled);

      if (hasExperiments) {
        console.log("🚧 Endatix experimental features (use with caution):");
        experiments.forEach((feature) => {
          const symbol = feature.enabled
            ? "\x1b[32m✓\x1b[0m" // Green Check
            : "\x1b[90m·\x1b[0m"; // Gray Dot
          console.log(`  ${symbol} ${feature.name}`);
        });
        console.log(""); // Empty line for spacing
      }

      // Mark as logged so child processes/re-evaluations skip it
      process.env.__ENDATIX_LOGGED = "true";
    }
  }

  return {
    ...nextConfig,
    env,
  };
};

export default withEndatix;
