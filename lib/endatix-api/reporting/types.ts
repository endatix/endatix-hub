export interface CompileFormSchemaResponse {
  formId: string;
  formDefinitionId: string;
}

export interface FormSchemaLocalesResponse {
  formId: string;
  locales: string[];
}

export interface BackfillSubmissionsRequest {
  batchSize?: number;
  afterSubmissionId?: string;
  force?: boolean;
  completionScope?: "completed" | "incomplete";
}

export interface BackfillSubmissionsResponse {
  formId: string;
  scanned: number;
  processed: number;
  skipped: number;
  failed: number;
  hasMore: boolean;
  nextAfterSubmissionId?: string | null;
  failedSubmissionIds: string[];
}

export interface PrepareReportingExportSummary {
  formDefinitionId: string;
  batches: number;
  processed: number;
  skipped: number;
  failed: number;
}
