import NextAuth from "next-auth";
import { authRegistry } from "./features/auth/infrastructure/registry";
import { createAuthConfig } from "./features/auth/infrastructure/config-factory";

// TODO: Add your custom providers here
// Example for GitHub auth provider
// import { GitHubAuthProvider } from "./features/auth/infrastructure/github-auth-provider";
// authRegistry.register(new GitHubAuthProvider());
// ------------------------------------------------------------------------------------------------
// Example for Google auth provider
// import { GoogleAuthProvider } from "./features/auth/infrastructure/examples/google-auth-provider";
// authRegistry.register(new GoogleAuthProvider());

// Create NextAuth configuration from registry
const authConfig = createAuthConfig(authRegistry);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
});

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
  }
}
