import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account, User } from "next-auth";

export interface IAuthProvider {
  handleJWT(params: {
    token: JWT;
    user?: User;
    account?: Account;
    trigger?: "signIn" | "signUp" | "update";
  }): Promise<JWT>;

  handleSession(params: { session: Session; token: JWT }): Promise<Session>;

  validateSetup?(config: any): Promise<boolean>;
}

export interface IAuthProviderRouter {
  getProvider(providerName: string): IAuthProvider;
  registerProvider(providerName: string, provider: IAuthProvider): void;
}

export class AuthProviderRouter implements IAuthProviderRouter {
  private readonly providers = new Map<string, IAuthProvider>();

  registerProvider(providerName: string, provider: IAuthProvider): void {
    this.providers.set(providerName, provider);
  }

  getProvider(providerName: string): IAuthProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`No auth provider registered for: ${providerName}`);
    }
    return provider;
  }

  hasProvider(providerName: string): boolean {
    return this.providers.has(providerName);
  }
}
