// Feature flag types and interfaces
export interface FeatureFlagConfig {
  experimentalFeatures: boolean;
  advancedAnalytics: boolean;
  aiFeatures: boolean;
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
