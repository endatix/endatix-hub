import { FormDefinition } from "@/types";
import {
  ApiEntity,
  type AuditDateFilters,
  type DateRangeFilter,
  EntityId,
  type IPagedRequest,
  JsonData,
  PaginationQuery,
  type SortRequest,
} from "../shared/types";
import { ApiResult } from "../shared/api-result";

/**
 * Submissions Types
 * All submission-related types in one organized file
 */

// ============================================================================
// Core Types & Enums
// ============================================================================

export type SubmissionStatus = "draft" | "completed" | "archived" | "deleted";

export const SUBMISSION_STATUS = {
  DRAFT: "draft" as const,
  COMPLETED: "completed" as const,
  ARCHIVED: "archived" as const,
  DELETED: "deleted" as const,
} as const;

// ============================================================================
// Domain Entities (what we work with in the app)
// ============================================================================

export interface Submission extends ApiEntity {
  formId: EntityId;
  formDefinitionId: EntityId;
  isComplete: boolean;
  isTestSubmission?: boolean;
  jsonData: JsonData;
  currentPage: number;
  metadata: JsonData;
  token: string;
  completedAt?: Date;
  startedAt?: Date;
  status: SubmissionStatus;
  submitterId?: EntityId;
  submitterDisplayId?: string;
  submitterProfile?: Record<string, string>;

  // Optional navigation properties
  formDefinition?: FormDefinition;
}

export interface SubmissionFile {
  id: EntityId;
  submissionId: EntityId;
  fileName: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: Date;
  downloadUrl?: string;
}

// ============================================================================
// Request/Response DTOs (what goes over the wire)
// ============================================================================

export type CreateSubmissionDto = {
  isComplete?: boolean;
  jsonData?: JsonData;
  currentPage?: number;
  metadata?: JsonData;
  reCaptchaToken?: string;
};

export type UpdateSubmissionDto = {
  isComplete?: boolean;
  jsonData?: JsonData;
  currentPage?: number;
  metadata?: JsonData;
  reCaptchaToken?: string;
};

export type UpdateSubmissionStatusDto = {
  status: SubmissionStatus;
};

export type ExportFormat =
  | "csv"
  | "csv-shoji"
  | "xlsx"
  | "json"
  | "codebook"
  | "codebook-shoji";

export type ExportSubmissionsDto = {
  exportFormat?: ExportFormat;
  includeMetadata?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
};

export type ReportingExportWireKey =
  | "csv"
  | "csv-shoji"
  | "json"
  | "codebook"
  | "codebook-shoji";
export type BooleanFilterValue = "true" | "false";
export type SubmissionReviewStatus = "new" | "read" | "approved";

export type ExportCompletionStatus = "all" | "completed" | "incomplete";

export type SubmissionListSortBy =
  | "createdAt"
  | "modifiedAt"
  | "startedAt"
  | "completedAt"
  | "id";

export interface ExportSubmissionsRequest
  extends AuditDateFilters, DateRangeFilter<"started" | "completed"> {
  formId: string;
  exportFormat?: ExportFormat;
  exportFormatId?: string;
  exportId?: string;
  includeTestSubmissions?: boolean;
  columnScope?: string[];
  /** Optional codebook label locale for this export run. */
  locale?: string;
  /** Optional completion filter. Omit means all (API default). */
  completionStatus?: ExportCompletionStatus;
  minSubmissionId?: string;
  maxSubmissionId?: string;
}

export interface ListSubmissionsRequest
  extends
    IPagedRequest,
    SortRequest<SubmissionListSortBy>,
    AuditDateFilters,
    DateRangeFilter<"started" | "completed"> {
  isComplete?: BooleanFilterValue[];
  status?: SubmissionReviewStatus[];
  isTestSubmission?: BooleanFilterValue[];
  submitterDisplayId?: string;
  submitterProfileFilter?: {
    field: string;
    value: string;
  };
}

export type SubmissionAccessTokenPermission =
  | "view"
  | "edit"
  | "export"
  | "submit";

export interface CreateSubmissionAccessTokenRequest {
  formId: string;
  submissionId: string;
  expiryMinutes: number;
  permissions: SubmissionAccessTokenPermission[];
}

export interface CreateSubmissionAccessTokenResponse {
  token: string;
  expiresAt: string;
  permissions: SubmissionAccessTokenPermission[];
}

export interface ListSubmissionsResponse {
  items: Submission[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

// ============================================================================
// API Method Responses (using ApiResult)
// ============================================================================

export type CreateSubmissionResponse = ApiResult<Submission>;
export type UpdateSubmissionResponse = ApiResult<Submission>;
export type GetSubmissionResponse = ApiResult<Submission>;
export type GetSubmissionsResponse = ApiResult<ListSubmissionsResponse>;
export type UpdateSubmissionStatusResponse = ApiResult<{
  status: SubmissionStatus;
  formId: EntityId;
  dateUpdated: string;
}>;
export type ExportSubmissionsResponse = ApiResult<Response>;

// ============================================================================
// Query & Search Types
// ============================================================================

export interface SubmissionQuery extends PaginationQuery {
  status?: SubmissionStatus;
  isComplete?: boolean;
  isTestSubmission?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchText?: string;
}

// ============================================================================
// Backward Compatibility
// ============================================================================

// Keep existing SubmissionData type available for features
export type SubmissionData = CreateSubmissionDto;
