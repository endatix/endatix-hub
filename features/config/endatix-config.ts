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
        authorizationUrl?: string;
        tokenUrl?: string;
        userInfoUrl?: string;
        scope?: string;
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
      credentials: {
        ...baseAuthConfig.providers.credentials,
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
    KEYCLOAK_ENABLED: mergedAuthConfig.providers.keycloak.enabled.toString(),
    KEYCLOAK_CLIENT_ID: mergedAuthConfig.providers.keycloak.clientId,
    KEYCLOAK_CLIENT_SECRET: mergedAuthConfig.providers.keycloak.clientSecret,
    KEYCLOAK_ISSUER: mergedAuthConfig.providers.keycloak.issuer,
    KEYCLOAK_AUTHORIZATION_URL:
      mergedAuthConfig.providers.keycloak.authorizationUrl,
    KEYCLOAK_TOKEN_URL: mergedAuthConfig.providers.keycloak.tokenUrl,
    KEYCLOAK_USERINFO_URL: mergedAuthConfig.providers.keycloak.userInfoUrl,
    KEYCLOAK_SCOPE: mergedAuthConfig.providers.keycloak.scope,
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
