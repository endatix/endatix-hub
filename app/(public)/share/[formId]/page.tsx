"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";

type ShareSurveyPage = {
  params: Promise<{ formId: string }>;
};

async function ShareSurveyPage({ params }: ShareSurveyPage) {
  const { formId } = await params;
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);

  const [submissionResult, activeDefinitionResult] = await Promise.all([
    getPartialSubmissionUseCase({ formId, tokenStore }),
    getActiveDefinitionUseCase({ formId }),
  ]);

  const submission = Result.isSuccess(submissionResult)
    ? submissionResult.value
    : undefined;

  if (Result.isError(activeDefinitionResult)) {
    return <div>Form not found</div>;
  }

  const activeDefinition = activeDefinitionResult.value;

  return (
    <SurveyJsWrapper
      formId={formId}
      definition={activeDefinition.jsonData}
      submission={submission}
      theme={activeDefinition.themeJsonData}
    />
  );
}

export default ShareSurveyPage;
