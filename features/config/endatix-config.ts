import type { NextConfig } from "next";
import { getAuthConfig, EndatixAuthConfig } from "./auth-config";

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
}

export interface WithEndatixOptions {
  auth?: EndatixConfig["auth"];
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

  // Set environment variables for auth configuration
  const env = {
    ...nextConfig.env,
    // Keycloak configuration
    AUTH_KEYCLOAK_ENABLED: mergedAuthConfig.providers.keycloak.enabled.toString(),
    AUTH_KEYCLOAK_CLIENT_ID: mergedAuthConfig.providers.keycloak.clientId,
    AUTH_KEYCLOAK_CLIENT_SECRET: mergedAuthConfig.providers.keycloak.clientSecret,
    AUTH_KEYCLOAK_ISSUER: mergedAuthConfig.providers.keycloak.issuer,

    // Session configuration
    SESSION_SECRET: mergedAuthConfig.session.secret,
    SESSION_MAX_AGE: mergedAuthConfig.session.maxAge.toString(),
  };

  return {
    ...nextConfig,
    env,
  };
};

export default withEndatix;
