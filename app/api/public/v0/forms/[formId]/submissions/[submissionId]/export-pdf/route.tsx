import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { parsePdfLocaleQuery } from "@/features/pdf-export/submission/pdf-locale";
import { renderSubmissionPdf } from "@/features/pdf-export/submission/render-submission-pdf.use-case";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { CustomQuestion } from "@/services/api";
import { NextRequest, NextResponse } from "next/server";
import { PDF_RENDER_TIMEOUT_CODE } from "@/features/pdf-export/render-timeout";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
};

const INLINE_QUERY_PARAM = "inline";
export async function GET(req: NextRequest, { params }: Params) {
  const startedAtMs = Date.now();
  const { formId, submissionId } = await params;

  const searchParams = req.nextUrl.searchParams;
  const inline = searchParams.get(INLINE_QUERY_PARAM);
  const localeQuery = parsePdfLocaleQuery(searchParams);

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
    customQuestionsJsonData = customQuestionsResult.value.map(
      (q: CustomQuestion) => q.jsonData,
    );
  }

  const submission = submissionResult.value;

  let renderResult;
  try {
    renderResult = await renderSubmissionPdf({
      submission,
      customQuestionsJsonData,
      localeQuery,
      startedAtMs,
      caller: "hub-authenticated",
    });
  } catch {
    return NextResponse.json({ error: "PDF export failed." }, { status: 500 });
  }

  if (Result.isError(renderResult)) {
    if (renderResult.errorCode === PDF_RENDER_TIMEOUT_CODE) {
      return NextResponse.json(
        {
          error:
            "PDF export took too long. Try again or export a smaller submission.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: renderResult.message }, { status: 500 });
  }

  const contentDisposition = inline === "true" ? "inline" : "attachment";

  return new Response(renderResult.value, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${contentDisposition}; filename="submission-${submissionId}.pdf"`,
    },
  });
}
