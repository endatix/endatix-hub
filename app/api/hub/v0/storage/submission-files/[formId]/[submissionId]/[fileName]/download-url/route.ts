import { NextRequest, NextResponse } from "next/server";
import { readAuthorizedSubmissionFile } from "../../../../read-authorized-submission-file";

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

/** GET: SAS URL and content-disposition metadata so the client can download the file. */
export async function GET(
  _req: NextRequest,
  context: DownloadUrlRequestParams,
) {
  const file = await readAuthorizedSubmissionFile(context.params);
  if (file instanceof NextResponse) {
    return file;
  }

  const body: DownloadUrlResponse = {
    url: file.url,
    fileName: file.originalFileName || file.displayName,
    contentType: file.contentType,
  };

  return NextResponse.json(body);
}
