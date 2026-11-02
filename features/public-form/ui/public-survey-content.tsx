import { getClientStorageConfig } from "@/features/asset-storage/server";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import type { PublicSurveyRuntimeProps } from "@/features/public-form/types";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import { PublicFormAccessError } from "@/features/public-form/ui/public-form-access-error";
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

type LoadedPage = Extract<
  Awaited<ReturnType<typeof loadPublicSurveyPageUseCase>>,
  { kind: "success" }
>;

/** The props sent to the client, field by field: nothing new crosses to the browser by default. */
function toSurveyRuntime(
  page: LoadedPage,
  request: PublicSurveyContentProps,
): PublicSurveyRuntimeProps {
  return {
    activeDefinition: page.activeDefinition,
    submissionPhase: page.submissionPhase,
    canStartOver: page.canStartOver,
    isRespondentTestMode: page.isRespondentTestMode,
    testInspector: page.testInspector,
    submission: page.submission,
    storageConfig: getClientStorageConfig(),
    ...request,
  };
}

type TokenErrorPage = Extract<
  Awaited<ReturnType<typeof loadPublicSurveyPageUseCase>>,
  { kind: "tokenSubmissionError" | "submissionLoadError" }
>;

function tokenErrorProps(page: TokenErrorPage) {
  return {
    errorCode: page.errorCode,
    personalLink: page.kind === "tokenSubmissionError" && page.personalLink,
  };
}

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

  if (
    pageResult.kind === "unauthorized" ||
    pageResult.kind === "forbidden" ||
    pageResult.kind === "formUnavailable" ||
    pageResult.kind === "accessLoadError"
  ) {
    return (
      <PublicFormAccessError
        errorCode={
          pageResult.kind === "accessLoadError"
            ? pageResult.errorCode
            : undefined
        }
        formId={formId}
        kind={pageResult.kind}
        message={
          pageResult.kind === "formUnavailable" ? pageResult.message : undefined
        }
        title={
          pageResult.kind === "formUnavailable" ? pageResult.title : undefined
        }
        urlToken={urlToken}
        variant={variant}
      />
    );
  }

  if (pageResult.kind === "notFound") {
    return notFound();
  }

  if (
    pageResult.kind === "tokenSubmissionError" ||
    pageResult.kind === "submissionLoadError"
  ) {
    return (
      <TokenSubmissionError
        {...tokenErrorProps(pageResult)}
        variant={variant}
      />
    );
  }

  const shouldLoadReCaptcha =
    pageResult.activeDefinition.requiresReCaptcha &&
    recaptchaConfig.isReCaptchaEnabled();
  const surveyRuntime = toSurveyRuntime(pageResult, {
    formId,
    urlToken,
    variant,
  });

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
