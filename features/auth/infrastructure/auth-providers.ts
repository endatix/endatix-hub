import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";

// Provider name constants - single source of truth
export const AUTH_PROVIDER_NAMES = {
  ENDATIX: "endatix",
  KEYCLOAK: "keycloak",
} as const;

export type AuthProviderName = typeof AUTH_PROVIDER_NAMES[keyof typeof AUTH_PROVIDER_NAMES];

export interface IAuthProvider {
  readonly name: AuthProviderName;

  handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT>;

  handleSession(params: { session: Session; token: JWT }): Promise<Session>;
}

export interface IAuthProviderRouter {
  getProvider(providerName: AuthProviderName): IAuthProvider;
  registerProvider(providerName: AuthProviderName, provider: IAuthProvider): void;
}

export class AuthProviderRouter implements IAuthProviderRouter {
  private readonly providers = new Map<AuthProviderName, IAuthProvider>();

  registerProvider(providerName: AuthProviderName, provider: IAuthProvider): void {
    this.providers.set(providerName, provider);
  }

  getProvider(providerName: AuthProviderName): IAuthProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`No auth provider registered for: ${providerName}`);
    }
    return provider;
  }

  hasProvider(providerName: AuthProviderName): boolean {
    return this.providers.has(providerName);
  }
}
