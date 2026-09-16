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
  remainingDeadlineMs,
} from "@/features/pdf-export/render-deadline";

type Params = {
  params: Promise<{
    formId: string;
  }>;
};

const DEFAULT_LOCALE_QUERY_PARAM = "defaultLocale";
const TOKEN_QUERY_PARAM = "token";

/** TEMPORARY test scaffolding - see the block in GET. Remove before merging. */
const FORCE_TIMEOUT_QUERY_PARAM = "timeOut";

/** Longer than any deadline, so the race below always expires first. */
const FORCE_TIMEOUT_MS = 60_000;

export async function GET(req: NextRequest, { params }: Params) {
  const startedAtMs = Date.now();
  const { formId } = await params;
  const searchParams = req.nextUrl.searchParams;

  const accept = req.headers.get("accept");

  // ---------------------------------------------------------------------------
  // TEMPORARY test scaffolding for issue #980 - REMOVE BEFORE MERGING.
  //
  // Static Web Apps only allows responseOverrides for 400/401/403/404; a 500
  // rewrite fails deploy validation, so the edge "Backend call failure" page
  // cannot be customized. The only error page we control is the one this route
  // returns *before* the platform gives up.
  //
  // So this races a sleep through the same deadline that guards the real render:
  // it expires at the budget, falls into the badGateway path below, and proves
  // the branded HTML 502 a user would actually see. Sleeping past the platform
  // limit instead would only re-demonstrate the page we cannot change.
  //
  // Kept ahead of the token check so an expired token cannot mask the result.
  // ---------------------------------------------------------------------------
  if (parseBoolean(searchParams.get(FORCE_TIMEOUT_QUERY_PARAM))) {
    try {
      await raceWithTimeout(
        new Promise((resolve) => setTimeout(resolve, FORCE_TIMEOUT_MS)),
        remainingDeadlineMs(startedAtMs),
      );
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
      remainingDeadlineMs(startedAtMs),
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
