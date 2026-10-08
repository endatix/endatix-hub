import { AuthPresentation, IAuthProvider } from "./types";
import { EndatixAuthProvider } from "./providers/endatix-auth-provider";

/** A registered provider's state: active, or why it is not. */
export type AuthProviderStatus =
  | { id: string; state: "active" }
  | { id: string; state: "invalid-config" }
  | { id: string; state: "failed"; error: unknown };

/**
 * Registry for managing auth providers. Replaces the AuthProviderRouter
 * and provides a cleaner API for registering and retrieving providers.
 */
export class AuthProviderRegistry {
  private readonly _allProviders = new Map<string, IAuthProvider>();
  private readonly _activeProviders = new Map<string, IAuthProvider>();
  private readonly _failures = new Map<string, unknown>();

  /**
   * Register a provider. If validation passes, it becomes active immediately.
   * Nothing is logged here: the module is evaluated again per route in
   * `next dev`, so the startup check reports the statuses once instead.
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
      }
    } catch (error) {
      this._failures.set(provider.id, error);
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
   * Get the status of every registered provider, in registration order.
   */
  getProviderStatuses(): AuthProviderStatus[] {
    return Array.from(this._allProviders.keys()).map((id) => {
      if (this._activeProviders.has(id)) {
        return { id, state: "active" };
      }
      if (this._failures.has(id)) {
        return { id, state: "failed", error: this._failures.get(id) };
      }
      return { id, state: "invalid-config" };
    });
  }

  /**
   * Get the auth presentation options for the active providers.
   */
  getAuthPresentationOptions(): AuthPresentation[] {
    return Array.from(this._activeProviders.values()).map((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      ...provider.getPresentationOptions(),
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
