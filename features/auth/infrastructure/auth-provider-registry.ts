import { AuthPresentation, IAuthProvider } from "./types";
import { EndatixAuthProvider } from "./providers/endatix-auth-provider";
import { icon } from "@/lib/utils/console-styles";

const LOGGED_PROVIDERS = Symbol.for("endatix.auth.loggedProviders");

function logProviderStatus(id: string, active: boolean): void {
  logProviderOnce(id, () =>
    active
      ? console.info(`${icon("🔐", "✓")} Auth provider ${id} active`)
      : console.warn(
          `${icon("🔐", "!")} Auth provider ${id} not activated: its configuration is invalid`,
        ),
  );
}

/**
 * Logs a provider's status once per process. The registry module is evaluated
 * again per route compile in `next dev` and in every `next build` worker, so a
 * module-level flag is not enough. During `next build` (NEXT_PHASE, set before
 * Next starts its workers) nothing is logged.
 */
function logProviderOnce(key: string, log: () => void): void {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  const store = globalThis as { [LOGGED_PROVIDERS]?: Set<string> };
  const logged = (store[LOGGED_PROVIDERS] ??= new Set<string>());
  if (logged.has(key)) {
    return;
  }
  logged.add(key);
  log();
}

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
      }
      logProviderStatus(provider.id, shouldActivate);
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
