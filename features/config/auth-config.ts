export interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scope?: string;
}

export interface EndatixAuthConfig {
  providers: {
    endatix: AuthProviderConfig;
    keycloak: AuthProviderConfig;
  };
  session: {
    secret: string;
    maxAge: number; // in seconds
  };
}

export function getAuthConfig(): EndatixAuthConfig {
  return {
    providers: {
      endatix: {
        enabled: true, // Always enabled as fallback
      },
      keycloak: {
        enabled: process.env.KEYCLOAK_ENABLED === "true",
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        issuer: process.env.KEYCLOAK_ISSUER,
        authorizationUrl: process.env.KEYCLOAK_AUTHORIZATION_URL,
        tokenUrl: process.env.KEYCLOAK_TOKEN_URL,
        userInfoUrl: process.env.KEYCLOAK_USERINFO_URL,
        scope: process.env.KEYCLOAK_SCOPE || "openid email profile",
      },
    },
    session: {
      secret: process.env.SESSION_SECRET || "your-secret-key",
      maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400"), // 24 hours default
    },
  };
}

export function getEnabledProviders(): string[] {
  const config = getAuthConfig();
  const enabledProviders: string[] = [];

  if (config.providers.endatix.enabled) {
    enabledProviders.push("endatix");
  }

  if (config.providers.keycloak.enabled) {
    enabledProviders.push("keycloak");
  }

  return enabledProviders;
}
