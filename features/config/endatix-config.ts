import type { NextConfig } from "next";
import { getAuthConfig, EndatixAuthConfig } from "./auth-config";
import { getApiConfig } from "./api-config";
import {
  getExperimentalConfig,
  logExperimentalStatus,
  type ExperimentalConfig,
} from "./experimental-config";
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

  const baseExperimentalConfig = getExperimentalConfig();
  const mergedExperimentalConfig: ExperimentalConfig = {
    ...baseExperimentalConfig,
    ...options.experimental,
  };

  logExperimentalStatus(mergedExperimentalConfig);

  // Set environment variables for endatix configuration
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

    // Experimental configuration
    ENDATIX_ENABLE_EXTENSIONS: mergedExperimentalConfig.extensions.toString(),
  };

  return {
    ...nextConfig,
    env,
  };
};

export default withEndatix;
