import { NextRequest, NextResponse } from "next/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { pdf } from "@react-pdf/renderer";
import { CustomQuestion } from "@/services/api";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { getSubmissionLocale } from "@/features/submissions/submission-localization";

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

  const pdfLocale = useDefaultLocale
    ? undefined
    : getSubmissionLocale(submission);

  const pdfBlob = await pdf(
    <SubmissionDetailsPdf
      submission={submission}
      customQuestions={customQuestionsJsonData}
      locale={pdfLocale}
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
