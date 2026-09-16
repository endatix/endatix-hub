import { renderSubmissionPdf } from "@/features/pdf-export/submission/render-submission-pdf.use-case";
import { asBrowserExportError } from "@/features/pdf-export/html-error-response";
import { mapPublicPdfExportLoadError } from "@/features/pdf-export/map-public-pdf-export-load-error";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import { Result } from "@/lib/result";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
import { apiResponses } from "@/lib/utils/route-handlers";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { NextRequest } from "next/server";
import { PDF_RENDER_TIMEOUT_CODE } from "@/features/pdf-export/render-timeout";

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

  const accept = req.headers.get("accept");
  // Relative by construction - never req.url, whose origin behind a proxy is
  // the container's internal host.
  const retryTarget = `${req.nextUrl.pathname}${req.nextUrl.search}`;

  const token = searchParams.get(TOKEN_QUERY_PARAM);
  const useDefaultLocale = parseBoolean(
    searchParams.get(DEFAULT_LOCALE_QUERY_PARAM),
  );

  if (!token) {
    return await asBrowserExportError(
      apiResponses.badRequest({
        detail: "Token is required.",
      }),
      accept,
      retryTarget,
    );
  }

  if (!hasTokenPermission(token, TokenPermission.Export)) {
    return await asBrowserExportError(
      apiResponses.forbidden({
        detail: "Access token does not have export permissions.",
      }),
      accept,
      retryTarget,
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
      retryTarget,
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
      retryTarget,
    );
  }

  submission.formDefinition = definitionResult.value;
  const customQuestionsJsonData = definitionResult.value.customQuestions ?? [];

  const renderResult = await renderSubmissionPdf({
    submission,
    customQuestionsJsonData,
    useDefaultLocale,
    startedAtMs,
    caller: "anonymous-token",
  });

  if (Result.isError(renderResult)) {
    if (renderResult.errorCode === PDF_RENDER_TIMEOUT_CODE) {
      return await asBrowserExportError(
        apiResponses.badGateway({
          detail:
            "PDF export took too long. Try again or export a smaller submission from Hub.",
          errorCode: PDF_RENDER_TIMEOUT_CODE,
        }),
        accept,
        retryTarget,
      );
    }

    return await asBrowserExportError(
      apiResponses.serverError({ detail: renderResult.message }),
      accept,
      retryTarget,
    );
  }

  return new Response(renderResult.value, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="submission-${submission.id}.pdf"`,
    },
  });
}
