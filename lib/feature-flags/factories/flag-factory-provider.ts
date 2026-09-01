import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";
import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";

/**
 * Whether to resolve flags through PostHog: the adapter must be switched on *and* a
 * project key must be configured.
 *
 * Reads the runtime environment directly rather than through `isPostHogEnabled()`. That
 * helper goes via the isomorphic accessor, which branches on `typeof window` — defined
 * under jsdom — so this server-only module would be handed the empty browser projection
 * during tests and silently fall back to environment flags. Same reasoning as
 * `posthog-flag-factory.ts`.
 */
function shouldUsePostHogFlags(): boolean {
  return (
    process.env.ENABLE_POSTHOG_ADAPTER === "true" &&
    Boolean(readPublicEndatixEnv().posthogKey)
  );
}

export class FlagFactoryProvider {
  private postHogFactory?: PostHogFlagFactory;
  private environmentFactory?: EnvironmentFlagFactory;

  private get postHogFactoryInstance(): PostHogFlagFactory {
    if (!this.postHogFactory) {
      this.postHogFactory = new PostHogFlagFactory();
    }
    return this.postHogFactory;
  }

  private get environmentFactoryInstance(): EnvironmentFlagFactory {
    if (!this.environmentFactory) {
      this.environmentFactory = new EnvironmentFlagFactory();
    }
    return this.environmentFactory;
  }

  getFactory(): FlagFactory {
    return shouldUsePostHogFlags()
      ? this.postHogFactoryInstance
      : this.environmentFactoryInstance;
  }
}

// Singleton instance
export const flagFactoryProvider = new FlagFactoryProvider();
