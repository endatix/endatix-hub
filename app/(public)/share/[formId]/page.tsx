"use server";

import { cookies } from "next/headers";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { Result } from "@/lib/result";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import {
  StoredTheme,
  themeRepository,
} from "@/app/api/hub/v0/themes/repository";

type ShareSurveyPage = {
  params: Promise<{ formId: string }>;
};

async function ShareSurveyPage({ params }: ShareSurveyPage) {
  const { formId } = await params;
  const cookieStore = await cookies();
  let theme : StoredTheme | undefined = undefined;
  const tokenStore = new FormTokenCookieStore(cookieStore);

  const [submissionResult, activeDefinitionResult, themeResult] =
    await Promise.all([
      getPartialSubmissionUseCase({ formId, tokenStore }),
      getActiveDefinitionUseCase({ formId }),
      getTheme(formId),
    ]);

  const submission = Result.isSuccess(submissionResult)
    ? submissionResult.value
    : undefined;

  if (Result.isError(activeDefinitionResult)) {
    return <div>Form not found</div>;
  }

  if (Result.isSuccess(themeResult)) {
    theme = themeResult.value;
  }

  const definition = activeDefinitionResult.value;

  return (
    <SurveyJsWrapper
      formId={formId}
      definition={definition}
      submission={submission}
      theme={theme}
    />
  );
}

const getTheme = async (formId: string): Promise<Result<StoredTheme>> => {
  const themeResult = await themeRepository.getThemeByFormId(formId);

  return themeResult
    ? Result.success(themeResult)
    : Result.error("Theme not found");
};

export default ShareSurveyPage;
