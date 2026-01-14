"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { ReCaptchaStyleFix } from "@/features/recaptcha/ui/recaptcha-style-fix";
import {
  getContainerNames,
} from "@/features/storage/infrastructure/storage-config";
import { generateReadTokensAction } from "@/features/storage/use-cases/generate-read-tokens";
import {
  ApiResult,
  isNotFoundError,
  isValidationError,
} from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";

type ShareSurveyPage = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
};

async function ShareSurveyPage({ params, searchParams }: ShareSurveyPage) {
  const { formId } = await params;
  const { token: urlToken } = await searchParams;
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);

  const containerNames = getContainerNames();
  const userFilesTokenPromise = generateReadTokensAction(
    containerNames.USER_FILES,
  );
  const contentTokenPromise = generateReadTokensAction(containerNames.CONTENT);

  const [submissionResult, activeDefinitionResult] = await Promise.all([
    getPartialSubmissionUseCase({ formId, tokenStore, urlToken }),
    getActiveDefinitionUseCase({ formId }),
  ]);

  if (
    (isNotFoundError(submissionResult) ||
      isValidationError(submissionResult)) &&
    urlToken
  ) {
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
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: "100%",
        height: "100%",
      }}
    >
      {shouldLoadReCaptcha && (
        <>
          <Script src={recaptchaConfig.JS_URL} strategy="beforeInteractive" />
          <ReCaptchaStyleFix />
        </>
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <SurveyJsWrapper
          formId={formId}
          definition={activeDefinition.jsonData}
          submission={submission}
          theme={activeDefinition.themeModel}
          customQuestions={activeDefinition.customQuestions}
          requiresReCaptcha={activeDefinition.requiresReCaptcha}
          urlToken={urlToken}
          readTokenPromises={{
            userFiles: userFilesTokenPromise,
            content: contentTokenPromise,
          }}
        />
      </Suspense>
    </div>
  );
}

export default ShareSurveyPage;
