import NextAuth from "next-auth";
import { authRegistry } from "./features/auth/infrastructure/registry";
import { createAuthConfig } from "./features/auth/infrastructure/config-factory";

// TODO: Add your custom providers here
// import { GitHubAuthProvider } from "./features/auth/infrastructure/github-auth-provider";
// authRegistry.register(new GitHubAuthProvider());

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
