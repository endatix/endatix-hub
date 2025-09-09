import { AuthPresentation, IAuthPresentation, IAuthProvider } from "./types";
import { EndatixAuthProvider } from "./providers/endatix-auth-provider";

/**
 * Registry for managing auth providers. Replaces the AuthProviderRouter
 * and provides a cleaner API for registering and retrieving providers.
 */
export class AuthProviderRegistry {
  private readonly _allProviders = new Map<string, IAuthProvider>();
  private readonly _activeProviders = new Map<string, IAuthProvider>();

  /**
   * Register a provider. If validation passes, it becomes active immediately.
   */
  register(provider: IAuthProvider): void {
    if (this._allProviders.has(provider.id)) {
      throw new Error(`Provider ${provider.id} already registered`);
    }

    this._allProviders.set(provider.id, provider);

    try {
      const shouldActivate = provider.validateConfig();
      if (shouldActivate) {
        this._activeProviders.set(provider.id, provider);
        console.info(`🔐 Provider ${provider.id} validated and activated`);
      } else {
        console.warn(
          `🔐 Provider ${provider.id} validation failed: not activated`,
        );
      }
    } catch (error) {
      console.warn(`⚠️ Provider ${provider.id} registration failed:`, error);
    }
  }

  /**
   * Get an active auth provider by its ID.
   */
  getProvider(id: string): IAuthProvider | undefined {
    return this._activeProviders.get(id);
  }

  /**
   * Check if an auth provider is active (enabled and properly configured).
   */
  isProviderActive(id: string): boolean {
    return this._activeProviders.has(id);
  }

  /**
   * Get only the providers that are properly configured and enabled.
   * Filters out providers where validateConfig() returns false.
   */
  getActiveProviders(): IAuthProvider[] {
    return Array.from(this._activeProviders.values());
  }

  /**
   * Get the auth presentation options for the active providers.
   */
  getAuthPresentationOptions(): AuthPresentation[] {
    return Array.from(this._activeProviders.values()).map((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      ...provider.getPresentationOptions()
    }));
  }
}

/**
 * Pre-configured registry with built-in providers already registered.
 * Developers can import this and add their custom providers.
 */
export const authRegistry = new AuthProviderRegistry();

// Register built-in providers
authRegistry.register(new EndatixAuthProvider());
