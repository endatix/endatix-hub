import { preparePdfModel } from "@/features/pdf-export/server";
import { SubmissionDetailsPdf } from "@/features/pdf-export/submission/submission-details-pdf";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { Result } from "@/lib/result";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
import { apiResponses } from "@/lib/utils/route-handlers";
import { parseBoolean } from "@/lib/utils/type-parsers";
import { CustomQuestion, getActiveFormDefinition } from "@/services/api";
import { pdf } from "@react-pdf/renderer";
import { NextRequest } from "next/server";

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
    return apiResponses.badRequest({
      detail: "Token is required.",
    });
  }

  if (!hasTokenPermission(token, TokenPermission.Export)) {
    return apiResponses.forbidden({
      detail: "Access token does not have export permissions.",
    });
  }

  const submissionResult = await getSubmissionByAccessTokenUseCase({
    formId,
    token,
  });

  if (Result.isError(submissionResult)) {
    const errorMessage = submissionResult.message.toLowerCase();

    if (errorMessage.includes("expired")) {
      return apiResponses.unauthorized({
        detail: "Access token has expired.",
      });
    }

    if (errorMessage.includes("permission") || errorMessage.includes("forbidden")) {
      return apiResponses.forbidden({
        detail: "Access denied.",
      });
    }

    return apiResponses.notFound({
      detail: "Submission not found.",
    });
  }

  const submission = submissionResult.value;

  let customQuestionsJsonData: string[] = [];
  try {
    const activeDefinition = await getActiveFormDefinition(
      submission.formId,
      true,
    );

    submission.formDefinition = activeDefinition;
    customQuestionsJsonData = (activeDefinition.customQuestions || []).map((q: string | CustomQuestion) => typeof q === "string" ? q : q.jsonData);
  } catch (error) {
    console.error("Failed to fetch form definition", error);
    return apiResponses.notFound({
      detail: "Form definition not found.",
    });
  }

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

  return new Response(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="submission-${submission.id}.pdf"`,
    },
  });
}
