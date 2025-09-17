"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { ReCaptchaStyleFix } from "@/features/recaptcha/ui/recaptcha-style-fix";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";

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

  const submission = ApiResult.isSuccess(submissionResult)
    ? submissionResult.data
    : undefined;

  if (Result.isError(activeDefinitionResult)) {
    return notFound();
  }

  const activeDefinition = activeDefinitionResult.value;

  const shouldLoadReCaptcha =
    activeDefinition.requiresReCaptcha && recaptchaConfig.isReCaptchaEnabled();

  return (
    <>
      {shouldLoadReCaptcha && (
        <>
          <Script src={recaptchaConfig.JS_URL} strategy="beforeInteractive" />
          <ReCaptchaStyleFix />
        </>
      )}
      <SurveyJsWrapper
        formId={formId}
        definition={activeDefinition.jsonData}
        submission={submission}
        theme={activeDefinition.themeModel}
        customQuestions={activeDefinition.customQuestions}
        requiresReCaptcha={activeDefinition.requiresReCaptcha}
      />
    </>
  );
}

export default ShareSurveyPage;
