import { IAuthProvider } from "./types";
import { EndatixAuthProvider } from "./providers/endatix-auth-provider";

/**
 * Registry for managing auth providers. Replaces the AuthProviderRouter
 * and provides a cleaner API for registering and retrieving providers.
 */
export class AuthProviderRegistry {
  private readonly providers = new Map<string, IAuthProvider>();
  private readonly status : string;

  constructor() {
    this.status = `Initialised at ${new Date().toISOString()}`;
  }

  getStatus(): string {
    return this.status;
  }

  /**
   * Register an auth provider.
   */
  register(provider: IAuthProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a specific provider by ID.
   */
  getProvider(id: string): IAuthProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): IAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get only the providers that are properly configured and enabled.
   * Filters out providers where validateConfig() returns false.
   */
  getEnabledProviders(): IAuthProvider[] {
    return this.getAllProviders().filter((provider) => {
      try {
        return provider.validateConfig();
      } catch (error) {
        console.warn(`Provider ${provider.id} validation failed:`, error);
        return false;
      }
    });
  }

  /**
   * Check if a provider is registered.
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Get provider IDs for enabled providers.
   */
  getEnabledProviderIds(): string[] {
    return this.getEnabledProviders().map((p) => p.id);
  }
}

/**
 * Pre-configured registry with built-in providers already registered.
 * Developers can import this and add their custom providers.
 */
export const authRegistry = new AuthProviderRegistry();

// Register built-in providers
authRegistry.register(new EndatixAuthProvider());
