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

export const formAnalyticsFlag = flag<boolean>({
  key: "form-analytics",
  defaultValue: false,
});

export const storageStatsFlag = flag<boolean>({
  key: "storage-stats",
  defaultValue: false,
});

export const reportingExportFlag = flag<boolean>({
  key: "reporting-export",
  defaultValue: false,
});

// Get all flags at once (async version)
export const getAllFlags = async (): Promise<FeatureFlagConfig> => ({
  experimentalFeatures: await experimentalFeaturesFlag(),
  advancedAnalytics: await advancedAnalyticsFlag(),
  aiFeatures: await aiFeaturesFlag(),
  formAnalytics: await formAnalyticsFlag(),
  storageStats: await storageStatsFlag(),
  reportingExport: await reportingExportFlag(),
});
