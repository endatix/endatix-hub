"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { ReCaptchaStyleFix } from "@/features/recaptcha/ui/recaptcha-style-fix";
import { ApiResult, isNotFoundError, isValidationError } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";

type EmbedSurveyPage = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
};

async function EmbedSurveyPage({ params, searchParams }: EmbedSurveyPage) {
  const { formId } = await params;
  const { token: urlToken } = await searchParams;
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);

  const [submissionResult, activeDefinitionResult] = await Promise.all([
    getPartialSubmissionUseCase({ formId, tokenStore, urlToken }),
    getActiveDefinitionUseCase({ formId }),
  ]);

  if ((isNotFoundError(submissionResult) || isValidationError(submissionResult)) && urlToken) {
    notFound();
  }

  const submission = ApiResult.isSuccess(submissionResult)
    ? submissionResult.data
    : undefined;

  if (Result.isError(activeDefinitionResult)) {
    notFound();
  }

  const activeDefinition = activeDefinitionResult.value;

  const shouldLoadReCaptcha =
    activeDefinition.requiresReCaptcha && recaptchaConfig.isReCaptchaEnabled();

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      {shouldLoadReCaptcha && (
        <>
          <Script src={recaptchaConfig.JS_URL} strategy="beforeInteractive" />
          <ReCaptchaStyleFix />
        </>
      )}

      <EmbedHeightReporter />

      <SurveyJsWrapper
        formId={formId}
        definition={activeDefinition.jsonData}
        submission={submission}
        theme={activeDefinition.themeModel}
        customQuestions={activeDefinition.customQuestions}
        requiresReCaptcha={activeDefinition.requiresReCaptcha}
        isEmbed={true}
        urlToken={urlToken}
      />
    </div>
  );
}

export default EmbedSurveyPage;
