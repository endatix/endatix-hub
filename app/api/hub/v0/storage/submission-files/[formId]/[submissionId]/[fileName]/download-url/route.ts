import { getUserFile } from "@/features/asset-storage/server";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
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
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId, submissionId, fileName } = await context.params;
  const decodedFileName = decodeURIComponent(fileName);

  const fileResult = await getUserFile(formId, submissionId, decodedFileName);

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
