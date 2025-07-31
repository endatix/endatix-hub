// Example configuration for withEndatix wrapper

// Example: Custom auth configuration
export const customAuthConfig = {
  auth: {
    providers: {
      credentials: {
        enabled: true, // Always enabled as fallback
      },
      keycloak: {
        enabled: true,
        clientId: "your-keycloak-client-id",
        clientSecret: "your-keycloak-client-secret",
        issuer: "https://your-keycloak-instance/auth/realms/your-realm",
        scope: "openid email profile",
      },
    },
    session: {
      secret: "your-super-secret-key",
      maxAge: 86400, // 24 hours in seconds
    },
  },
};

// Example: How to use in next.config.ts
/*
import { withEndatix } from './lib/auth/with-endatix';
import { customAuthConfig } from './lib/auth/example-config';

const nextConfig = {
  // ... your Next.js config
};

export default withEndatix(nextConfig, customAuthConfig);
*/
