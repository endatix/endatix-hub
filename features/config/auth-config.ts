export interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
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
        enabled: process.env.AUTH_KEYCLOAK_ENABLED === "true",
        clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET,
        issuer: process.env.AUTH_KEYCLOAK_ISSUER
      },
    },
    session: {
      secret: process.env.SESSION_SECRET || "your-secret-key",
      maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400"), // 24 hours default
    },
  };
}
