import { flag } from "./utils";
import type { FeatureFlagConfig } from "./types";

export const aiFeaturesFlag = flag<boolean>({
  key: "ai-features",
  defaultValue: false,
});

// General feature flags
export const experimentalFeaturesFlag = flag<boolean>({
  key: "experimental-features",
  defaultValue: false,
});

export const advancedAnalyticsFlag = flag<boolean>({
  key: "advanced-analytics",
  defaultValue: false,
});

// Get all flags at once (async version)
export const getAllFlags = async (): Promise<FeatureFlagConfig> => ({
  experimentalFeatures: await experimentalFeaturesFlag(),
  advancedAnalytics: await advancedAnalyticsFlag(),
  aiFeatures: await aiFeaturesFlag(),
});
