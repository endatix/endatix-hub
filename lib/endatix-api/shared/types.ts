/**
 * Shared types and contracts for the Endatix API
 * These are common across all API modules
 */

// ============================================================================
// Base Types
// ============================================================================

export type EntityId = string;
export type JsonData = string;

// ============================================================================
// Common API Contracts
// ============================================================================

export interface ApiEntity {
  id: EntityId;
  createdAt: Date;
  modifiedAt?: Date;
}

export interface ITenantOwned {
  tenantId: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Request Options
// ============================================================================

export interface BaseRequestOptions {
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
}

export interface FileUploadOptions extends BaseRequestOptions {
  allowedTypes?: string[];
  maxSizeBytes?: number;
}

// ============================================================================
// Common Response Types
// ============================================================================

export interface StatusResponse {
  status: string;
  message?: string;
  timestamp: Date;
}

export interface BulkOperationResponse {
  successful: number;
  failed: number;
  errors?: string[];
}
