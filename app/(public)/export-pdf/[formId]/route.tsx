import { preparePdfModel } from "@/features/pdf-export/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { asBrowserExportError } from "@/features/pdf-export/html-error-response";
import { mapPublicPdfExportLoadError } from "@/features/pdf-export/map-public-pdf-export-load-error";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import { Result } from "@/lib/result";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
import { apiResponses } from "@/lib/utils/route-handlers";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { pdf } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import {
  isPdfRenderTimeout,
  raceWithTimeout,
  remainingSwaBudgetMs,
} from "@/features/pdf-export/swa-render-budget";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

const DEFAULT_LOCALE_QUERY_PARAM = "defaultLocale";
const TOKEN_QUERY_PARAM = "token";

export async function GET(req: NextRequest, { params }: Params) {
  const startedAtMs = Date.now();
  const { formId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get(TOKEN_QUERY_PARAM);
  const useDefaultLocale = parseBoolean(
    searchParams.get(DEFAULT_LOCALE_QUERY_PARAM),
  );

  const accept = req.headers.get("accept");

  if (!token) {
    return await asBrowserExportError(
      apiResponses.badRequest({
        detail: "Token is required.",
      }),
      accept,
    );
  }

  if (!hasTokenPermission(token, TokenPermission.Export)) {
    return await asBrowserExportError(
      apiResponses.forbidden({
        detail: "Access token does not have export permissions.",
      }),
      accept,
    );
  }

  const submissionResult = await getSubmissionByAccessTokenUseCase({
    formId,
    token,
  });

  if (Result.isError(submissionResult)) {
    return await asBrowserExportError(
      mapPublicPdfExportLoadError(submissionResult),
      accept,
    );
  }

  const submission = submissionResult.value;
  const definitionResult = resolveSubmissionFormDefinition(submission);

  if (Result.isError(definitionResult)) {
    console.error(definitionResult.message);
    return await asBrowserExportError(
      apiResponses.notFound({
        detail: "Form definition not found.",
      }),
      accept,
    );
  }

  submission.formDefinition = definitionResult.value;
  const customQuestionsJsonData = definitionResult.value.customQuestions ?? [];

  const surveyModel = await preparePdfModel({
    submission,
    customQuestionsJsonData,
    useDefaultLocale,
  });

  try {
    const pdfBlob = await raceWithTimeout(
      pdf(
        <SubmissionDetailsPdf
          submission={submission}
          surveyModel={surveyModel}
        />,
      ).toBlob(),
      remainingSwaBudgetMs(startedAtMs),
    );

    return new Response(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="submission-${submission.id}.pdf"`,
      },
    });
  } catch (error) {
    if (isPdfRenderTimeout(error)) {
      return await asBrowserExportError(
        apiResponses.badGateway({
          detail:
            "PDF export took too long. Try again or export a smaller submission from Hub.",
          errorCode: "pdf_render_timeout",
        }),
        accept,
      );
    }

    throw error;
  }
}
