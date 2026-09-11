import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";
import { shouldUsePostHogFlags } from "./posthog-flag-settings";

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

export const flagFactoryProvider = new FlagFactoryProvider();
