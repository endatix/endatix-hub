// Main exports
export { flag } from "./utils";
export { identify } from "./identify";
export type { FeatureFlagConfig, AIFeatures } from "./types";
export * from "./flags";

// Factory exports (for advanced usage)
export {
  flagFactoryProvider,
  readFlagSettings,
} from "./factories/flag-factory-provider";
export type { FlagProviderName, FlagSettings } from "./flag-settings";
export type {
  FlagFactory,
  FlagDefinition,
} from "./factories/flag-factory.interface";
export { PostHogFlagFactory } from "./factories/posthog-flag-factory";
export { EnvironmentFlagFactory } from "./factories/environment-flag-factory";
