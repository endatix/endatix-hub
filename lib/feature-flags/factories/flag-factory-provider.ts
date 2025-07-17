import { isPostHogEnabled } from "@/features/analytics/posthog/shared/config";
import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";

// Check if we should use PostHog flags
function shouldUsePostHogFlags(): boolean {
  return process.env.ENABLE_POSTHOG_ADAPTER === "true" && isPostHogEnabled();
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
