import type { SubmissionListUrlState } from "@/features/submissions/list-submission-query";
import type { DefinitionField } from "@/lib/endatix-api";
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import type { Submission } from "@/lib/endatix-api/submissions/types";
import type { Error as ResultError } from "@/lib/result";

/**
 * Successful submissions list page load.
 * Paging/totals live on `page`; filters/sort live on `listState` — do not
 * explode those stems onto this type.
 */
export type SubmissionListViewModel = {
  formId: string;
  hasAnySubmissions: boolean;
  useReportingExport: boolean;
  definitionFields: DefinitionField[];
  page: PagedResponse<Submission>;
  listState: SubmissionListUrlState;
};

/**
 * Outcome of composing list + fields Results (and optional unfiltered probe).
 * The route/section matches on `kind` — no React inside the resolver.
 */
export type SubmissionListPageLoad =
  | { kind: "ready"; model: SubmissionListViewModel }
  | { kind: "error"; result: ResultError }
  | { kind: "notFound" }
  | { kind: "redirect"; href: string };
