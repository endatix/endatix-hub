import NextAuth from "next-auth";
import { authRegistry } from "./features/auth/infrastructure/auth-provider-registry";
import { createAuthConfig } from "./features/auth/infrastructure/config-factory";
import { AuthPresentation } from "./features/auth/infrastructure";

// Example auth provider registration (uncomment to use)
// import {
//   KeycloakAuthProvider,
//   GoogleAuthProvider,
// } from "./features/auth/infrastructure/providers";

// authRegistry.register(new KeycloakAuthProvider());
// authRegistry.register(new GoogleAuthProvider());

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

// Create NextAuth configuration from registry
const authConfig = createAuthConfig(authRegistry);

export const authPresentation: AuthPresentation[] = authConfig.authPresentation;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
});
