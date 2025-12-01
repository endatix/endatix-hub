import { NextRequest, NextResponse } from "next/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { getActiveFormDefinition } from "@/services/api";
import { pdf } from "@react-pdf/renderer";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { getSubmissionLocale } from "@/features/submissions/submission-localization";
import { EndatixApi, ApiResult } from "@/lib/endatix-api";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

const DEFAULT_LOCALE_QUERY_PARAM = "defaultLocale";
const TOKEN_QUERY_PARAM = "token";

export async function GET(req: NextRequest, { params }: Params) {
  const { formId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get(TOKEN_QUERY_PARAM);
  const useDefaultLocale = parseBoolean(
    searchParams.get(DEFAULT_LOCALE_QUERY_PARAM),
  );

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  const endatix = new EndatixApi();
  // eslint-disable-next-line testing-library/no-await-sync-queries
  const submissionResult = await endatix.submissions.public.getByToken(
    formId,
    token,
  );

  if (!ApiResult.isSuccess(submissionResult)) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 404 },
    );
  }

  const submission = submissionResult.data;

  let customQuestions: string[] = [];
  try {
    const activeDefinition = await getActiveFormDefinition(
      submission.formId,
      true,
    );

    submission.formDefinition = activeDefinition;
    customQuestions = activeDefinition.customQuestions || [];
  } catch (error) {
    console.error("Failed to fetch form definition", error);
    return NextResponse.json(
      { error: "Form definition not found" },
      { status: 404 },
    );
  }

  const pdfLocale = useDefaultLocale
    ? undefined
    : getSubmissionLocale(submission);

  const pdfBlob = await pdf(
    <SubmissionDetailsPdf
      submission={submission}
      customQuestions={customQuestions}
      locale={pdfLocale}
    />,
  ).toBlob();

  return new Response(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="submission-${submission.id}.pdf"`,
    },
  });
}
