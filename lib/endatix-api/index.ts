// ============================================================================
// Safe Default Exports - Client & Server Compatible Types Only
// ============================================================================

// Export only client-safe types by default

export * from "./shared/api-result";
export * from "./shared/error-codes";
export * from "./types";
export * from "./data-lists/types";
export * from "./platform-tenants/types";
export * from "./platform-admins/types";
export * from "./auth-admin/types";

// ============================================================================
// For Server-Only Features
// ============================================================================

export { EndatixApi } from "./endatix-api";
