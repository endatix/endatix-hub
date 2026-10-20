import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  SubmissionGridColumnsResponse,
  SubmissionGridSearchSlots,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import {
  Result,
  toResult,
  type Error as ResultError,
  type ResultType,
} from "@/lib/result";
import {
  listFilterableQuestions,
  type FilterableQuestion,
} from "./filterable-questions";

export type FilterableQuestionsLoad =
  | { kind: "hidden" }
  | { kind: "error"; result: ResultError }
  | {
      kind: "ready";
      questions: FilterableQuestion[];
      slots: SubmissionGridSearchSlots;
      canEdit: boolean;
    };

const LOAD_FAILURE = {
  fallbackMessage: "Unable to load the filterable questions.",
  logMessage: "Failed to load the form's filterable questions.",
  loggerName: "submissions.choose-filterable-questions",
};

export async function loadFilterableQuestions(
  formId: string,
): Promise<FilterableQuestionsLoad> {
  if (!(await reportingExportFlag())) {
    return { kind: "hidden" };
  }

  const session = await auth();
  const { checkPermission } = await authorization(session);
  const [columns, edit] = await Promise.all([
    new EndatixApi(session?.accessToken).reporting.submissionGrid.listColumns(
      formId,
    ),
    checkPermission(Permissions.Forms.Edit),
  ]);
  return resolveFilterableQuestionsLoad(
    toResult(columns, LOAD_FAILURE),
    edit.success,
  );
}

export function resolveFilterableQuestionsLoad(
  result: ResultType<SubmissionGridColumnsResponse>,
  canEdit: boolean,
): FilterableQuestionsLoad {
  if (Result.isError(result)) {
    return result.statusCode === 404
      ? { kind: "hidden" }
      : { kind: "error", result };
  }

  const { schemaReady, columns, searchSlots } = result.value;
  if (!schemaReady || !searchSlots) return { kind: "hidden" };

  const questions = listFilterableQuestions(columns);
  return { kind: "ready", questions, slots: searchSlots, canEdit };
}
