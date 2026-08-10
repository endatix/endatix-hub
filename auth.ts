import NextAuth from "next-auth";
import { authRegistry } from "./features/auth/infrastructure/auth-provider-registry";
import { createAuthConfig } from "./features/auth/infrastructure/config-factory";
import { AuthPresentation } from "./features/auth/infrastructure";
import { authTelemetryLogger } from "./features/auth/infrastructure/auth-telemetry-logger";

// Example auth provider registration (uncomment to use)
// import {
//   KeycloakAuthProvider,
//   GoogleAuthProvider,
// } from "./features/auth/infrastructure/providers";

// authRegistry.register(new KeycloakAuthProvider());
// authRegistry.register(new GoogleAuthProvider());

// Create NextAuth configuration from registry
export const authConfig = createAuthConfig(authRegistry);

export const authPresentation: AuthPresentation[] = authConfig.authPresentation;

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  // After the spread, so this is authoritative. No provider config sets a logger today; if one
  // ever needs to, it should compose with this rather than replace it, or auth failures stop
  // reaching telemetry again.
  logger: authTelemetryLogger,
});

export type SessionError =
  | "RefreshTokenError"
  | "SessionExpiredError"
  | "UnknownSessionError";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: SessionError;
    provider?: string;
    user?: {
      name?: string;
      email?: string;
      id?: string;
    };
  }

  export interface CurrentUserInfo {
    isLoggedIn: boolean;
    name: string;
    email: string;
    id: string;
    initials: string;
    displayName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    provider?: string;
    expires_at?: number;
    error?: SessionError;
  }
}
