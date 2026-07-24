"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type DeleteSubmissionResult = Result<string>;

export async function deleteSubmissionAction(
  formId: string,
  submissionId: string,
): Promise<DeleteSubmissionResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.submissions.delete(formId, submissionId);

  if (!apiResult.success) {
    return toResult(apiResult, {
      fallbackMessage: "Failed to delete submission",
      logMessage: "Failed to delete submission",
      loggerName: "submissions.delete",
    });
  }

  revalidatePath(`/(main)/forms/${formId}/submissions`);
  revalidatePath(`/(main)/forms/${formId}/submissions/${submissionId}`);
  revalidatePath(`/(main)/forms/${formId}`);

  return Result.success(submissionId);
}
