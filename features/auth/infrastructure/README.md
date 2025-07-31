# Authentication Provider System

This system provides a clean, extensible way to handle authentication for different providers in NextAuth.

## Architecture

The system consists of:

1. **IAuthProvider Interface** - Contract for all authentication providers
2. **AuthProviderRouter** - Routes authentication calls to appropriate providers
3. **Provider Implementations** - Individual classes for each authentication provider
4. **Main Auth Configuration** - Uses the router to delegate authentication logic

## Core Components

### IAuthProvider Interface

```typescript
export interface IAuthProvider {
  handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT>;
  
  handleSession(params: {
    session: Session;
    token: JWT;
  }): Promise<Session>;
}
```

### AuthProviderRouter

```typescript
export class AuthProviderRouter implements IAuthProviderRouter {
  registerProvider(providerName: string, provider: IAuthProvider): void;
  getProvider(providerName: string): IAuthProvider;
  hasProvider(providerName: string): boolean;
}
```

## Adding a New Provider

To add a new authentication provider:

### 1. Create Auth Provider Implementation

```typescript
// features/auth/infrastructure/github-auth-provider.ts
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";
import { IAuthProvider } from "./auth-providers";

export class GitHubAuthProvider implements IAuthProvider {
  async handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT> {
    const { token, user, account } = params;

    if (account?.provider === "github" && account.access_token) {
      token.accessToken = account.access_token;
      token.provider = "github";
      
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
    }

    return token;
  }

  async handleSession(params: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
    const { session, token } = params;

    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      name: token.name as string,
      email: token.email as string,
    };

    return session;
  }
}
```

### 2. Register the Provider

```typescript
// In auth.ts
import { GitHubAuthProvider } from "./features/auth/infrastructure/github-auth-provider";

// Register the new provider
authRouter.registerProvider("github", new GitHubAuthProvider());
```

### 3. Add the Provider to NextAuth Configuration

```typescript
// In auth.ts
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // ... existing providers
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  // ... rest of configuration
});
```

## Current Providers

### EndatixAuthProvider
- Authenticates against the Endatix API
- Validates credentials using Zod schema
- Stores access and refresh tokens from API response

### KeycloakAuthProvider
- Uses OAuth2 flow with Keycloak
- Stores tokens from OAuth response
- Handles OpenID Connect scope

## Benefits

1. **Clean Interface** - All providers implement the same contract
2. **Separation of Concerns** - Each provider handles its own authentication logic
3. **Extensibility** - Easy to add new providers without modifying existing code
4. **Maintainability** - Provider-specific logic is contained and testable
5. **Type Safety** - Full TypeScript support with proper interfaces

## Error Handling

The system includes fallback handling for unknown providers and logs warnings when no provider is found. 