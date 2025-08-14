import { FormDefinition } from "@/types";
import {
  ApiEntity,
  EntityId,
  JsonData,
  PaginationQuery,
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
  jsonData: JsonData;
  currentPage: number;
  metadata: JsonData;
  submittedBy?: string;
  token: string;
  completedAt?: Date;
  status: SubmissionStatus;

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

export type ExportSubmissionsDto = {
  exportFormat: "csv" | "xlsx" | "json";
  includeMetadata?: boolean;
  dateRange?: {
    from: string; // ISO date string
    to: string; // ISO date string
  };
};

// ============================================================================
// API Method Responses (using ApiResult)
// ============================================================================

export type CreateSubmissionResponse = ApiResult<Submission>;
export type UpdateSubmissionResponse = ApiResult<Submission>;
export type GetSubmissionResponse = ApiResult<Submission>;
export type GetSubmissionsResponse = ApiResult<Submission[]>;
export type UpdateSubmissionStatusResponse = ApiResult<{
  status: SubmissionStatus;
  formId: EntityId;
  dateUpdated: string;
}>;
export type GetSubmissionFilesResponse = ApiResult<Response>;
export type ExportSubmissionsResponse = ApiResult<Response>;

// ============================================================================
// Query & Search Types
// ============================================================================

export interface SubmissionQuery extends PaginationQuery {
  status?: SubmissionStatus;
  isComplete?: boolean;
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
