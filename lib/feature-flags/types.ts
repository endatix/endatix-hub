// Feature flag types and interfaces
export interface FeatureFlagConfig {
  experimentalFeatures: boolean;
  advancedAnalytics: boolean;
  aiFeatures: boolean;
  formAnalytics: boolean;
  storageStats: boolean;
  reportingExport: boolean;
  /** Mirrors API `multi-tenancy` deployment flag. */
  tenantManagement: boolean;
  /** Mirrors API `saas-management` deployment flag. */
  saasManagement: boolean;
}

export interface AIFeatures {
  enabled: boolean;
  assistant: {
    enabled: boolean;
    name?: string;
  };
}

export type FeatureFlagKey = keyof FeatureFlagConfig;

// Evaluation context for advanced flag decisions
export interface EvaluationContext {
  entities?: {
    stableId?: string;
    userId?: string;
    tenantId?: string;
  };
}
