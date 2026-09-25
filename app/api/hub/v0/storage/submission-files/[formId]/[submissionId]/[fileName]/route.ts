import { getUserFile } from "@/features/asset-storage/server";
import type { UserFileViewData } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { apiResponses } from "@/lib/utils/route-handlers";
import { Result } from "@/lib/result";
import { NextRequest, NextResponse } from "next/server";

type SubmissionFileRequestParams = {
  params: Promise<{
    formId: string;
    submissionId: string;
    fileName: string;
  }>;
};

export type SubmissionFileResponse = UserFileViewData;

/**
 * GET: Returns a freshly signed view URL plus the stored metadata (original name,
 * question, size) for one submission file. Called each time the file details dialog
 * opens, so a page left open past the read-token lifetime still gets a working URL.
 */
export async function GET(
  _req: NextRequest,
  context: SubmissionFileRequestParams,
) {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const permissionCheck = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.View,
  ]);
  if (!permissionCheck.success) {
    return apiResponses.forbidden({ detail: "Forbidden" });
  }

  const { formId, submissionId, fileName } = await context.params;
  const fileResult = await getUserFile(formId, submissionId, fileName);

  if (Result.isError(fileResult)) {
    return apiResponses.notFound({
      detail: fileResult.message ?? "File not found",
    });
  }

  const body: SubmissionFileResponse = fileResult.value;
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
