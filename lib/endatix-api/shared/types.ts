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

export interface IPagedRequest {
  page?: number;
  pageSize?: number;
}

/** Wire sort direction for list requests (`sortDir` query key). */
export type SortDir = "asc" | "desc";

/**
 * Typed sort capability for list requests (Hub counterpart of OSS `ISortableRequest<T>`).
 * @template TFields - Closed set of sortable field names for the list (e.g. `"createdAt"`).
 */
export interface SortRequest<TFields extends string> {
  sortBy?: TFields;
  sortDir?: SortDir;
}

/**
 * Inclusive UTC calendar day (`YYYY-MM-DD`) From/To bounds for event stems.
 *
 * Stems are bare verbs (`"created"`, `"modified"`), not property names:
 * `"created"` → `createdFrom` / `createdTo`. Sort fields stay `createdAt`.
 *
 * @template T - Event stem(s), e.g. `"created" | "modified"`.
 */
export type DateRangeFilter<T extends string> = {
  [K in `${T}From` | `${T}To`]?: string;
};

/** Created + modified calendar day bounds (most Hub list surfaces). */
export type AuditDateFilters = DateRangeFilter<"created" | "modified">;

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
}

/**
 * A standardized wrapper for paginated API responses.
 * @template T - The type of data contained in the items array.
 */
export interface PagedResponse<T> {
  /** The current page index - first page is 1 */
  page: number;

  /** The number of items requested per page */
  pageSize: number;

  /** The total count of records available across all pages */
  totalRecords: number;

  /** The calculated total number of pages */
  totalPages: number;

  /** The actual data payload for the current page */
  items: ReadonlyArray<T>;
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
