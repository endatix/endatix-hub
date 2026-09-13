import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";
import { shouldUsePostHogFlags } from "./posthog-flag-settings";

export class FlagFactoryProvider {
  private factory?: FlagFactory;

  /**
   * Provider is chosen from env on first call and held for the process.
   * Mid-process env changes are ignored.
   */
  getFactory(): FlagFactory {
    if (!this.factory) {
      this.factory = shouldUsePostHogFlags()
        ? new PostHogFlagFactory()
        : new EnvironmentFlagFactory();
    }
    return this.factory;
  }

  /** Test seam: drop the frozen factory so the next `getFactory()` re-reads env. */
  resetForTests(): void {
    this.factory = undefined;
  }
}

export const flagFactoryProvider = new FlagFactoryProvider();
