import { auth } from "@/auth";
import { getUserFile } from "@/features/asset-storage/server";
import type { UserFileViewData } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import { authorization } from "@/features/auth";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { NextResponse } from "next/server";

export type SubmissionFileRouteParams = {
  formId: string;
  submissionId: string;
  fileName: string;
};

/** Hub user who can view forms, then the submission file. Errors are HTTP responses. */
export async function readAuthorizedSubmissionFile(
  params: Promise<SubmissionFileRouteParams>,
): Promise<UserFileViewData | NextResponse> {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const permissionCheck = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.View,
  ]);
  if (!permissionCheck.success) {
    return apiResponses.forbidden({ detail: "Forbidden" });
  }

  const { formId, submissionId, fileName } = await params;
  const fileResult = await getUserFile(formId, submissionId, fileName);
  if (Result.isError(fileResult)) {
    return apiResponses.notFound({
      detail: fileResult.message ?? "File not found",
    });
  }

  return fileResult.value;
}
