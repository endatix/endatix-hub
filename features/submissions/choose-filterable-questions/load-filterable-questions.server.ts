import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  SubmissionGridColumnsResponse,
  SubmissionGridSearchSlots,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import type { Session } from "next-auth";
import { Result, toResult, type ResultType } from "@/lib/result";
import {
  listFilterableQuestions,
  type FilterableQuestion,
} from "./filterable-questions";

/** The form's filterable questions, or why the settings leave them out. */
export type FilterableQuestionsLoad =
  /** Flag off, no reporting for the form, or an API that cannot choose keys. */
  | { kind: "hidden" }
  | { kind: "error"; message: string }
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
  const api = new EndatixApi(session?.accessToken);
  const [columns, canEdit] = await Promise.all([
    api.reporting.submissionGrid.listColumns(formId),
    canEditForm(session),
  ]);
  return resolveFilterableQuestionsLoad(
    toResult(columns, LOAD_FAILURE),
    canEdit,
  );
}

export function resolveFilterableQuestionsLoad(
  result: ResultType<SubmissionGridColumnsResponse>,
  canEdit: boolean,
): FilterableQuestionsLoad {
  if (Result.isError(result)) {
    return result.statusCode === 404
      ? { kind: "hidden" }
      : { kind: "error", message: result.message };
  }

  const { columns, searchSlots } = result.value;
  if (!searchSlots) return { kind: "hidden" };

  const questions = listFilterableQuestions(columns);
  return { kind: "ready", questions, slots: searchSlots, canEdit };
}

async function canEditForm(session: Session | null): Promise<boolean> {
  const { checkPermission } = await authorization(session);
  const result = await checkPermission(Permissions.Forms.Edit);
  return result.success;
}
