# Endatix Authentication System

A flexible, extensible authentication system built on NextAuth.js with support for multiple providers and easy customization.

## Architecture Overview

The system uses a **Provider Registry** pattern that allows for:

- **Easy provider registration** - Add any auth provider with a simple API
- **Type-safe provider handling** - Full TypeScript support
- **Environment-based configuration** - Enable/disable providers via env vars
- **Clean separation of concerns** - Provider config vs callback handling

## Getting Started

### Simple Provider Registration

The system provides a pre-configured registry with built-in providers already registered:

```typescript
// hub/auth.ts (Template)
import NextAuth from "next-auth";
import { authRegistry } from "./features/auth/infrastructure/auth-provider-registry";
import { createAuthConfig } from "./features/auth/infrastructure/config-factory";

// TODO: Add your custom providers here
// import { GitHubAuthProvider } from "./features/auth/infrastructure/github-auth-provider";
// authRegistry.register(new GitHubAuthProvider());

// Create NextAuth configuration from registry
const authConfig = createAuthConfig(authRegistry);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
});
```

**To customize:**
1. Import your custom provider
2. Register it with `authRegistry.register(new MyProvider())`
3. Add environment variables
4. Done!

## Built-in Providers

### Endatix JWT (Credentials)

Always enabled as the fallback authentication method. Uses JWT tokens for authentication and stores user information in the database.

**Environment Variables:**

- No configuration required (built-in)

### Keycloak (OIDC)

Enterprise SSO provider for organizational deployments using OpenID Connect.

**Environment Variables:**

```bash
AUTH_KEYCLOAK_ENABLED=true
AUTH_KEYCLOAK_CLIENT_ID=your-client-id
AUTH_KEYCLOAK_CLIENT_SECRET=your-client-secret
AUTH_KEYCLOAK_ISSUER=https://your-keycloak.com/realms/your-realm
```

### Google OAuth

Popular OAuth provider for easy user authentication.

**Environment Variables:**

```bash
AUTH_GOOGLE_CLIENT_ID=your-google-client-id
AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Adding Custom Providers

### 1. Implement IAuthProvider

```typescript
import { IAuthProvider, JWTParams, SessionParams } from "./types";
import MyProvider from "next-auth/providers/my-provider";

export class MyCustomProvider implements IAuthProvider {
  readonly id = "my-provider";
  readonly name = "My Provider";
  readonly type = "oauth" as const;

  getProviderConfig() {
    return MyProvider({
      id: this.id,
      name: this.name,
      clientId: process.env.MY_PROVIDER_CLIENT_ID,
      clientSecret: process.env.MY_PROVIDER_CLIENT_SECRET,
    });
  }

  validateConfig(): boolean {
    return (
      process.env.MY_PROVIDER_ENABLED === "true" &&
      !!process.env.MY_PROVIDER_CLIENT_ID &&
      !!process.env.MY_PROVIDER_CLIENT_SECRET
    );
  }

  async handleJWT(params: JWTParams) {
    // Handle JWT token processing
    return params.token;
  }

  async handleSession(params: SessionParams) {
    // Handle session data
    return params.session;
  }
}
```

### 2. Register the Provider

Update `auth.ts`:

```typescript
import { MyCustomProvider } from "./features/auth/infrastructure/my-custom-provider";

// Add to registry
authRegistry.register(new MyCustomProvider());
```

### 3. Environment Configuration

```bash
MY_PROVIDER_ENABLED=true
MY_PROVIDER_CLIENT_ID=your-client-id
MY_PROVIDER_CLIENT_SECRET=your-client-secret
```

## Extending Built-in Providers

You can extend existing providers to customize behavior:

```typescript
export class CustomKeycloakProvider extends KeycloakAuthProvider {
  getProviderConfig() {
    return {
      ...super.getProviderConfig(),
      // Custom overrides
      authorization: {
        params: {
          scope: "custom-scope additional-permissions",
        },
      },
    };
  }

  async handleJWT(params: JWTParams) {
    const token = await super.handleJWT(params);

    // Add custom JWT processing
    if (params.account?.provider === this.id) {
      token.customField = "custom-value";
    }

    return token;
  }
}

// Register the extended provider
authRegistry.register(new CustomKeycloakProvider());
```

## Docker Compose Configuration

```yaml
services:
  endatix-hub:
    environment:
      # Endatix JWT (always enabled)

      # Keycloak
      - AUTH_KEYCLOAK_ENABLED=true
      - AUTH_KEYCLOAK_CLIENT_ID=${AUTH_KEYCLOAK_CLIENT_ID}
      - AUTH_KEYCLOAK_CLIENT_SECRET=${AUTH_KEYCLOAK_CLIENT_SECRET}
      - AUTH_KEYCLOAK_ISSUER=${AUTH_KEYCLOAK_ISSUER}

      # Google OAuth
      - AUTH_GOOGLE_CLIENT_ID=${AUTH_GOOGLE_CLIENT_ID}
      - AUTH_GOOGLE_CLIENT_SECRET=${AUTH_GOOGLE_CLIENT_SECRET}

      # Custom provider
      - GITHUB_ENABLED=true
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
```

## Key Interfaces

### IAuthProvider

The core interface all providers must implement:

```typescript
interface IAuthProvider {
  readonly id: string; // Unique provider ID
  readonly name: string; // Display name
  readonly type: "credentials" | "oauth" | "oidc" | "email";

  getProviderConfig(): Provider; // NextAuth provider config
  handleJWT(params: JWTParams): Promise<JWT>; // Token processing
  handleSession(params: SessionParams): Promise<Session>; // Session handling
  validateConfig?(): boolean; // Optional: check if enabled
}
```

### authRegistry

Pre-configured registry with built-in providers:

```typescript
import { authRegistry } from "./features/auth/infrastructure/auth-provider-registry";

// Add custom providers
authRegistry.register(new MyProvider());
// or
authRegistry.register(new MyProvider(options)); //TODO: Add options support

// Check enabled providers
const enabledProviders = authRegistry.getEnabledProviderIds();
```

## Examples

See `examples/` folder for complete provider implementations:

- `github-auth-provider.example.ts` - OAuth provider example

## Benefits

- **Simplicity** - Clean, minimal API for adding providers
- **Flexibility** - Support any NextAuth provider + custom logic
- **Type Safety** - Full TypeScript support throughout
- **Environment Driven** - Easy Docker/Kubernetes deployment
- **Extensibility** - Extend built-in providers or create custom ones
- **Maintainability** - Clear separation of concerns
