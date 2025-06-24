import { NextRequest, NextResponse } from "next/server";
import { SubmissionDataPdf } from "@/components/export/submission-data-pdf";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { pdf } from "@react-pdf/renderer";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
};

const INLINE_QUERY_PARAM = "inline";
export async function GET(req: NextRequest, { params }: Params) {
  const { formId, submissionId } = await params;

  const searchParams = req.nextUrl.searchParams;
  const inline = searchParams.get(INLINE_QUERY_PARAM);

  let customQuestions: CustomQuestion[] = [];
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
    customQuestions = customQuestionsResult.value;
  }

  const submission = submissionResult.value;

  initializeCustomQuestions(
    customQuestions.map((q: CustomQuestion) => q.jsonData),
  );

  const pdfBlob = await pdf(
    <SubmissionDataPdf
      submission={submission}
      customQuestions={customQuestions}
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
