import { PostHogFlagFactory } from "./posthog-flag-factory";
import { EnvironmentFlagFactory } from "./environment-flag-factory";
import type { FlagFactory } from "./flag-factory.interface";
import {
  readRequestedFlagProvider,
  shouldUsePostHogFlags,
} from "./posthog-flag-settings";
import type { FlagProviderName, FlagSettings } from "../flag-settings";

export class FlagFactoryProvider {
  private factory?: FlagFactory;

  getFactory(): FlagFactory {
    this.factory ??= shouldUsePostHogFlags()
      ? new PostHogFlagFactory()
      : new EnvironmentFlagFactory();
    return this.factory;
  }

  /**
   * The provider Hub flags are actually running on, or `null` before the first evaluation
   * in this process. Reports the frozen choice rather than re-reading env, so a diagnostic
   * view cannot claim a provider the flags themselves are not using. Never selects.
   */
  getSelectedProvider(): FlagProviderName | null {
    if (!this.factory) {
      return null;
    }
    return this.factory instanceof PostHogFlagFactory
      ? "posthog"
      : "environment";
  }

  /** Vitest: unfreeze so the next `getFactory()` re-reads env. */
  resetForTests(): void {
    this.factory = undefined;
  }
}

export const flagFactoryProvider = new FlagFactoryProvider();

/** The whole flag configuration, for diagnostics. The one projection admin views read. */
export function readFlagSettings(): FlagSettings {
  return Object.freeze({
    requestedProvider: readRequestedFlagProvider(),
    provider: flagFactoryProvider.getSelectedProvider(),
  });
}
