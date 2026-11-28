import type {
  AuditDateFilters,
  IPagedRequest,
  SortRequest,
} from "../shared/types";
import { z } from "zod";

export const formDraftSchema = z.object({
  version: z.string().regex(/^\d+$/),
  jsonData: z.string(),
  contentHash: z.string(),
  activeNumber: z.int().nullish(),
  hasUnpublishedChanges: z.boolean(),
  lastModifiedAt: z.string().nullish(),
  lastModifiedBy: z
    .object({
      kind: z.enum(["user", "system"]),
      userId: z.string().nullish(),
    })
    .nullish(),
  recordsSinceSnapshot: z.int().nonnegative(),
});

export type FormDraft = z.infer<typeof formDraftSchema>;

export interface DraftJournalBatch {
  saveNo: number;
  clientSessionId: string;
  records: readonly object[];
  jsonData: string;
  contentHash: string;
  checkpoints?: readonly { afterRecord: number; jsonData: string }[];
}

export interface DraftAcknowledgement {
  version: string;
  contentHash: string;
  saveNo: number;
  recordsSinceSnapshot: number;
}

export interface FormCheckFinding {
  key: string;
  code: string;
  severity: "error" | "warning" | "info";
  blocking: boolean;
  requiresAck: boolean;
  message: string;
  path: Partial<
    Record<"page" | "element" | "choice" | "property", string | null>
  >;
  origin: "hub" | "server";
  data?: unknown;
}

export interface FormCheckReport {
  draftVersion: string;
  contentHash: string;
  outcome: "pass" | "warn" | "block";
  findings: FormCheckFinding[];
}

export interface StartPublicationRequest {
  partials: { policy: "keep_all" };
  acknowledgedFindings: readonly string[];
  note?: string;
}

export interface FormPublication {
  id: string;
  formId: string;
  draftVersion: string;
  status:
    | "queued"
    | "checking"
    | "refused"
    | "committing"
    | "published"
    | "rolling_out"
    | "completed"
    | "failed";
  requestedAt: string;
  committedAt?: string | null;
  completedAt?: string | null;
  definitionId?: string | null;
  definitionNumber?: number | null;
  outcome?: "published" | "unchanged" | null;
  findings?: FormCheckReport | null;
  failureReason?: string | null;
}

export type FormListSortBy = "name" | "createdAt" | "modifiedAt";

export interface FormsListRequest
  extends IPagedRequest, SortRequest<FormListSortBy>, AuditDateFilters {
  search?: string;
  isEnabled?: boolean;
  isPublic?: boolean;
  /** Advanced filter expression when typed fields are not sufficient. */
  filter?: string;
  folderId?: string;
  themeId?: string;
  /** Computed: maps to filter folderId:null for unassigned forms. */
  unassignedOnly?: boolean;
}

export interface UpdateFormRequest {
  name?: string;
  isEnabled?: boolean;
  isPublic?: boolean;
  limitOnePerUser?: boolean;
  submissionTokenExpiryHours?: number | null;
  clearSubmissionTokenExpiryHours?: boolean;
  metadata?: string | null;
  themeId?: string | null;
  webHookSettingsJson?: string;
  folderId?: string | null;
  clearFolderId?: boolean;
}

/** Optional body for POST /public/forms/{formId}/access-tokens. */
export interface CreateFormAccessTokenRequest {
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
}

export interface FormAccessTokenResponse {
  token: string;
  expiresAtUtc: string;
}

/** Query for GET /public/forms/{formId}/access. */
export interface GetPublicFormAccessRequest {
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
  acceptLanguage?: string;
}

/** Response from GET /public/forms/{formId}/access. */
export interface PublicFormAccessResponse {
  formId: string;
  submissionId: string | null;
  formPermissions: string[];
  submissionPermissions: string[];
  limitOnePerUser: boolean;
  hasUserSubmitted: boolean;
  canStartNewSubmission: boolean;
  isRespondentTestMode: boolean;
  cachedAt: string;
  expiresAt: string;
  eTag: string;
}
export interface FormPdfSettings {
  version: string;
  pdf: { usesFormTheme: boolean };
}
