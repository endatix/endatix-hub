// ============================================================================
// Safe Default Exports - Client & Server Compatible Types Only
// ============================================================================

// Export only client-safe types by default

export * from "./shared/api-result";
export * from "./shared/error-codes";
export * from "./types";

// ============================================================================
// For Server-Only Features
// ============================================================================

export { EndatixApi } from "./endatix-api";
