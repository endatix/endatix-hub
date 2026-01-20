import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { preparePdfModel } from "@/features/pdf-export/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { CustomQuestion } from "@/services/api";
import { pdf } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
};

const INLINE_QUERY_PARAM = "inline";
const DEFAULT_LOCALE_QUERY_PARAM = "defaultLocale";
export async function GET(req: NextRequest, { params }: Params) {
  const { formId, submissionId } = await params;

  const searchParams = req.nextUrl.searchParams;
  const inline = searchParams.get(INLINE_QUERY_PARAM);
  const useDefaultLocale = parseBoolean(
    searchParams.get(DEFAULT_LOCALE_QUERY_PARAM),
  );

  let customQuestionsJsonData: string[] = [];
  const [submissionResult, customQuestionsResult] = await Promise.all([
    getSubmissionDetailsUseCase({
      formId,
      submissionId,
    }),
    getCustomQuestionsAction(),
  ]);

  if (Result.isError(submissionResult)) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (Result.isSuccess(customQuestionsResult)) {
    customQuestionsJsonData = customQuestionsResult.value.map((q: CustomQuestion) => q.jsonData);
  }

  const submission = submissionResult.value;

  const surveyModel = await preparePdfModel({
    submission,
    customQuestionsJsonData,
    useDefaultLocale,
  });

  const pdfBlob = await pdf(
    <SubmissionDetailsPdf
      submission={submission}
      surveyModel={surveyModel}
    />,
  ).toBlob();

  const contentDisposition = inline === "true" ? "inline" : "attachment";

  return new Response(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${contentDisposition}; filename="submission-${submissionId}.pdf"`,
    },
  });
}
