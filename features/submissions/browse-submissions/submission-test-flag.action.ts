"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  DeleteTestSubmissionsResponse,
  Submission,
} from "@/lib/endatix-api/submissions/types";
import { Result, toResult } from "@/lib/result";
import { revalidatePath } from "next/cache";

const LOGGER_NAME = "submissions.browse-submissions.test-flag";

/** Counting and deleting a form's test submissions (the API checks the same two). */
const DELETE_TESTS_PERMISSIONS = [
  Permissions.Forms.Test,
  Permissions.Submissions.Delete,
];

/**
 * Marks a submission as test or as real. Marking as real fails with
 * `submission_exists` and the existing submission's id (`existingId`) when the
 * submitter already has a real one.
 */
export async function setSubmissionTestAction(
  formId: string,
  submissionId: string,
  isTest: boolean,
): Promise<Result<void>> {
  const api = await authorizedApi([Permissions.Forms.Test]);
  const kind = isTest ? "test" : "real";
  const result = toResult<Submission, void>(
    await api.submissions.setTest(formId, submissionId, isTest),
    {
      ...failureOptions(`Unable to mark the submission as ${kind}.`),
      mapData: () => undefined,
    },
  );
  if (Result.isSuccess(result)) revalidateGrid(formId);
  return result;
}

/** Deletes every test submission of the form, whatever its status. */
export async function deleteTestSubmissionsAction(
  formId: string,
): Promise<Result<DeleteTestSubmissionsResponse>> {
  const api = await authorizedApi(DELETE_TESTS_PERMISSIONS);
  const result = toResult(
    await api.submissions.deleteTests(formId),
    failureOptions("Unable to delete the test submissions."),
  );
  if (Result.isSuccess(result)) revalidateGrid(formId);
  return result;
}

/** How many test submissions a delete would remove, in every status. */
export async function countTestSubmissionsAction(
  formId: string,
): Promise<Result<number>> {
  const api = await authorizedApi(DELETE_TESTS_PERMISSIONS);
  return toResult(
    await api.submissions.list(formId, {
      isTestSubmission: ["true"],
      page: 1,
      pageSize: 1,
    }),
    {
      ...failureOptions("Unable to count the test submissions."),
      mapData: (page) => page.totalRecords,
    },
  );
}

/** Redirects when the user lacks Hub access or any of `permissions`. */
async function authorizedApi(permissions: string[]): Promise<EndatixApi> {
  const session = await auth();
  const { requireAllPermissions } = await authorization(session);
  await requireAllPermissions([Permissions.Access.Hub, ...permissions]);
  return new EndatixApi(session?.accessToken);
}

function failureOptions(failure: string) {
  return {
    fallbackMessage: failure,
    logMessage: failure,
    loggerName: LOGGER_NAME,
  };
}

function revalidateGrid(formId: string) {
  revalidatePath(`/forms/${formId}/submissions`);
}
