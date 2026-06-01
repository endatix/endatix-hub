import { getClientStorageConfig } from "@/features/asset-storage/server";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import type { PublicSurveyRuntimeProps } from "@/features/public-form/types";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { TokenSubmissionError } from "@/features/public-form/ui/token-submission-error";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { ReCaptchaStyleFix } from "@/features/recaptcha/ui/recaptcha-style-fix";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";

export type PublicSurveyContentProps = {
  formId: string;
  urlToken?: string;
  variant: PublicSurveyRuntimeProps["variant"];
};

export async function PublicSurveyContent({
  formId,
  urlToken,
  variant,
}: Readonly<PublicSurveyContentProps>) {
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  const pageResult = await loadPublicSurveyPageUseCase({
    formId,
    tokenStore,
    urlToken,
  });

  if (pageResult.kind === "notFound") {
    return notFound();
  }

  if (
    pageResult.kind === "tokenSubmissionError" ||
    pageResult.kind === "submissionLoadError"
  ) {
    return <TokenSubmissionError errorCode={pageResult.errorCode} />;
  }

  const {
    activeDefinition,
    isRespondentTestMode,
    submission,
    submissionPhase,
  } = pageResult;
  const shouldLoadReCaptcha =
    activeDefinition.requiresReCaptcha && recaptchaConfig.isReCaptchaEnabled();
  const surveyRuntime: PublicSurveyRuntimeProps = {
    activeDefinition,
    formId,
    submissionPhase,
    isRespondentTestMode,
    submission,
    storageConfig: getClientStorageConfig(),
    urlToken,
    variant,
  };

  return (
    <>
      {shouldLoadReCaptcha && (
        <>
          <Script src={recaptchaConfig.JS_URL} strategy="afterInteractive" />
          <ReCaptchaStyleFix />
        </>
      )}

      {variant === "embed" && <EmbedHeightReporter />}

      <SurveyJsWrapper survey={surveyRuntime} />
    </>
  );
}
