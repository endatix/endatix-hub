import type { UserFileViewData } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import { NextRequest, NextResponse } from "next/server";
import { readAuthorizedSubmissionFile } from "../../../read-authorized-submission-file";

type SubmissionFileRequestParams = {
  params: Promise<{
    formId: string;
    submissionId: string;
    fileName: string;
  }>;
};

export type SubmissionFileResponse = UserFileViewData;

/**
 * GET: Freshly signed view URL plus stored metadata. The details dialog calls
 * this on each open, so a page left open past the read-token lifetime still works.
 */
export async function GET(
  _req: NextRequest,
  context: SubmissionFileRequestParams,
) {
  const file = await readAuthorizedSubmissionFile(context.params);
  if (file instanceof NextResponse) {
    return file;
  }

  const body: SubmissionFileResponse = file;
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
