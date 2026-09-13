import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";
import { shouldUsePostHogFlags } from "./posthog-flag-settings";

export class FlagFactoryProvider {
  private factory?: FlagFactory;

  getFactory(): FlagFactory {
    this.factory ??= shouldUsePostHogFlags()
      ? new PostHogFlagFactory()
      : new EnvironmentFlagFactory();
    return this.factory;
  }

  /** Vitest: unfreeze so the next `getFactory()` re-reads env. */
  resetForTests(): void {
    this.factory = undefined;
  }
}

export const flagFactoryProvider = new FlagFactoryProvider();
