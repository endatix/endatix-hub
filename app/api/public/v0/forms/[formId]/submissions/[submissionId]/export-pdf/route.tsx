import { NextRequest, NextResponse } from "next/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { pdf } from "@react-pdf/renderer";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { parseBoolean, tryParseJson } from "@/lib/utils/type-parsers";
import { Submission } from "@/lib/endatix-api";
import { Metadata, MetadataSchema } from "@/features/public-form/types";

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

  const pdfLocale = getPdfLocale(submission, useDefaultLocale);

  const pdfBlob = await pdf(
    <SubmissionDetailsPdf
      submission={submission}
      customQuestions={customQuestions}
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

/**
 * TODO: Move this to a shared location if used in other places
 * Get the PDF locale according to the view preference
 * @param submission - The submission
 * @param useDefaultLocale - Whether to use the default locale
 * @returns The PDF locale
 */
function getPdfLocale(
  submission: Submission,
  useDefaultLocale: boolean = false,
): string | undefined {
  if (useDefaultLocale) {
    return undefined;
  }

  if (!submission.metadata) {
    return undefined;
  }

  const parsedJsonResult = tryParseJson<Metadata>(submission.metadata);
  if (Result.isError(parsedJsonResult)) {
    return undefined;
  }

  const metadataResult = MetadataSchema.safeParse(parsedJsonResult.value);
  if (metadataResult.success) {
    return metadataResult.data?.language ?? undefined;
  }

  return undefined;
}
