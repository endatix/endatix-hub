# Endatix Auth System

Flexible authentication system for Endatix Hub with environment-based configuration and extensible provider architecture.

## Quick Start

### Environment Variables

```bash
# Session Configuration (Required)
SESSION_SECRET=your-super-secret-key-here
SESSION_MAX_AGE=86400

# Keycloak Configuration (Optional)
KEYCLOAK_ENABLED=true
KEYCLOAK_CLIENT_ID=your-keycloak-client-id
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret
KEYCLOAK_ISSUER=https://your-keycloak-instance/auth/realms/your-realm
KEYCLOAK_SCOPE=openid email profile
```

### Environment Variable Validation

The system validates required environment variables at startup:

- **SESSION_SECRET** - Required for session encryption
- **Keycloak variables** - Required only if `KEYCLOAK_ENABLED=true`

### Programmatic Configuration

```typescript
// next.config.ts
import { withEndatix } from "./features/config/with-endatix";

const authConfig = {
  auth: {
    providers: {
      endatix: { enabled: true },
      keycloak: {
        enabled: process.env.KEYCLOAK_ENABLED === "true",
        clientId: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
        issuer: process.env.KEYCLOAK_ISSUER!,
        // Custom scope with additional permissions
        scope: process.env.KEYCLOAK_SCOPE || "openid email profile roles",
        // Custom authorization URL for specific realm
        authorizationUrl: process.env.KEYCLOAK_AUTHORIZATION_URL,
        // Custom token URL for load-balanced setup
        tokenUrl: process.env.KEYCLOAK_TOKEN_URL,
      },
    },
    session: {
      secret: process.env.SESSION_SECRET!,
      // Extended session duration for SSO
      maxAge: parseInt(process.env.SESSION_MAX_AGE || "604800"), // 7 days
    },
  },
};

export default withEndatix(nextConfig, authConfig);
```

## Architecture

### Core Components

- **IAuthProvider Interface** - Contract for all authentication providers
- **AuthProviderRouter** - Routes authentication calls to appropriate providers
- **Provider Implementations** - Individual classes for each authentication provider

### Current Providers

- **EndatixAuthProvider** - Username/password authentication against Endatix API
- **KeycloakAuthProvider** - OAuth2 flow with Keycloak identity provider

## Adding a New Provider

### Custom Providers (Coming Soon)

The ability to add custom authentication providers will be available in a future release. This will include:

- **Provider Factory Pattern** - Easy registration of custom providers
- **Extensible Configuration** - Add providers via configuration
- **NPM Package Support** - Ship as `@endatix/auth` package
- **Type-Safe Extensions** - Full TypeScript support for custom providers

### Current Supported Providers

- **EndatixAuthProvider** - Username/password authentication against Endatix API (provider: "endatix")
- **KeycloakAuthProvider** - OAuth2 flow with Keycloak identity provider (provider: "keycloak")

### Provider Validation

Providers can implement optional validation to ensure proper configuration:

```typescript
// Example: Keycloak provider validation
export class KeycloakAuthProvider implements IAuthProvider {
  async validateSetup(config: KeycloakConfig): Promise<boolean> {
    if (config.enabled) {
      if (!config.clientId || !config.clientSecret || !config.issuer) {
        throw new Error("Keycloak enabled but missing required configuration");
      }

      // Validate issuer URL format
      try {
        new URL(config.issuer);
      } catch {
        throw new Error("Invalid Keycloak issuer URL");
      }
    }

    return true;
  }

  // ... other methods
}
```

### Future Use Case Example

```typescript
// Future implementation (not yet supported)
import { createEndatixAuth } from "@endatix/auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = createEndatixAuth({
  providers: [
    {
      name: "github",
      provider: GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      }),
      handler: new GitHubAuthProvider(),
    },
  ],
});
```

### Recommended Practices

#### Environment Variables

Always use environment variables for sensitive configuration:

```bash
# .env.local
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Configuration Validation

Validate required environment variables:

```typescript
// Validate required env vars
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  throw new Error("GitHub OAuth credentials not configured");
}
```

#### Conditional Provider Loading

Only load providers when properly configured:

```typescript
const providers = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push({
    name: "github",
    provider: GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    handler: new GitHubAuthProvider(),
  });
}

export const { handlers, signIn, signOut, auth } = createEndatixAuth({
  providers,
});
```

## Benefits

- **Environment-based configuration** - Configure via environment variables
- **Extensible architecture** - Easy to add new auth providers
- **Type safety** - Full TypeScript support
- **Clean separation** - Each provider handles its own logic
- **Sensible defaults** - Works out of the box with minimal configuration

## Troubleshooting

- **Keycloak not working**: Ensure `KEYCLOAK_ENABLED=true` and all required env vars are set
- **Session issues**: Verify `SESSION_SECRET` is set and unique
- **Provider not loading**: Check environment variables and browser console for errors
