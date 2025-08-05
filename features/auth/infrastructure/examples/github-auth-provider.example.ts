/**
 * Example implementation of a custom GitHub auth provider.
 * This demonstrates how developers can add new providers to the Endatix auth system.
 *
 * To use this:
 * 1. Copy this file and remove the .example.ts extension
 * 2. Install required dependencies: npm install next-auth/providers/github
 * 3. Add environment variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * 4. Register in auth.ts: authRegistry.register(new GitHubAuthProvider());
 */

import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { IAuthProvider, JWTParams, SessionParams } from "../types";
import GitHub from "next-auth/providers/github";
import { Provider } from "next-auth/providers";

export const GITHUB_ID = "github";

export class GitHubAuthProvider implements IAuthProvider {
  readonly id = GITHUB_ID;
  readonly name = "GitHub";
  readonly type = "oauth" as const;

  getProviderConfig(): Provider {
    return GitHub({
      id: this.id,
      name: this.name,
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      // Custom configuration
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    });
  }

  validateConfig(): boolean {
    // Check if GitHub is enabled and has required configuration
    const isEnabled = process.env.GITHUB_ENABLED === "true";
    const hasRequiredConfig = !!(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    );

    if (isEnabled && !hasRequiredConfig) {
      console.warn(
        "GitHub is enabled but missing required configuration (clientId, clientSecret)",
      );
      return false;
    }

    return isEnabled;
  }

  async handleJWT(params: JWTParams): Promise<JWT> {
    const { token, user, account } = params;

    if (account?.provider === this.id) {
      token.accessToken = account.access_token;
      token.refreshToken = account.refresh_token;
      token.provider = this.id;

      // GitHub-specific token handling
      token.githubId = account.providerAccountId;
    }

    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
    }

    return token;
  }

  async handleSession(params: SessionParams): Promise<Session> {
    const { session, token } = params;

    session.accessToken = token.accessToken as string;
    session.user = {
      ...session.user,
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
    };

    return session;
  }
}

/**
 * Usage in auth.ts:
 * 
 * import { GitHubAuthProvider } from "./features/auth/infrastructure/github-auth-provider";
 * import { authRegistry } from "./features/auth/infrastructure/registry";
 * 
 * // Register the GitHub provider
 * authRegistry.register(new GitHubAuthProvider());
 */
