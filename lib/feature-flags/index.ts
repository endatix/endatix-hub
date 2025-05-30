// Main exports
export { flag, identify } from "./utils";
export type { FeatureFlagConfig, AIFeatures } from "./types";
export * from "./flags";

// Factory exports (for advanced usage)
export { flagFactoryProvider } from "./factories/flag-factory-provider";
export type {
  FlagFactory,
  FlagDefinition,
} from "./factories/flag-factory.interface";
export { PostHogFlagFactory } from "./factories/posthog-flag-factory";
export { EnvironmentFlagFactory } from "./factories/environment-flag-factory";
