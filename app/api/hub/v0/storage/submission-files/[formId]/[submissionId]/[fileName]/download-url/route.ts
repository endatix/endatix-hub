import { getUserFile } from "@/features/asset-storage/server";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { apiResponses } from "@/lib/utils/route-handlers";
import { Result } from "@/lib/result";
import { NextRequest, NextResponse } from "next/server";

type DownloadUrlRequestParams = {
  params: Promise<{
    formId: string;
    submissionId: string;
    fileName: string;
  }>;
};

export interface DownloadUrlResponse {
  url: string;
  fileName: string;
  contentType?: string;
}

/**
 * GET: Returns the SAS URL and content-disposition metadata so the client can download the file.
 */
export async function GET(
  _req: NextRequest,
  context: DownloadUrlRequestParams,
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

  const file = fileResult.value;
  const body: DownloadUrlResponse = {
    url: file.url,
    fileName: file.originalFileName || file.displayName,
    contentType: file.contentType,
  };

  return NextResponse.json(body);
}
