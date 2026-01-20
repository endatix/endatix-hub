"use server";

import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import "@/components/error-handling/not-found/not-found-styles-standalone.css";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import SurveyJsWrapper from "@/features/public-form/ui/survey-js-wrapper";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { ReCaptchaStyleFix } from '@/features/recaptcha/ui/recaptcha-style-fix';
import { ApiResult, Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
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

  if (urlToken) {
    if (!hasTokenPermission(urlToken, TokenPermission.Read)) {
      return (
        <NotFoundComponent
          notFoundTitle="Access Denied"
          notFoundSubtitle="You don't have permission to view this submission"
          notFoundMessage="The access token does not include view permissions."
          titleSize="medium"
        />
      );
    }

    if (!hasTokenPermission(urlToken, TokenPermission.Write)) {
      return (
        <NotFoundComponent
          notFoundTitle="Access Denied"
          notFoundSubtitle="You don't have permission to edit this submission"
          notFoundMessage="The access token does not include edit permissions."
          titleSize="medium"
        />
      );
    }
  }

  // Fetch submission: URL token uses access token API, otherwise cookie-based partial submission
  const submissionResultPromise = urlToken
    ? getSubmissionByAccessTokenUseCase({ formId, token: urlToken })
    : getPartialSubmissionUseCase({ formId, tokenStore, urlToken: undefined });

  const [submissionResult, activeDefinitionResult] = await Promise.all([
    submissionResultPromise,
    getActiveDefinitionUseCase({ formId }),
  ]);

  let submission;

  if (urlToken) {
    const accessTokenResult = submissionResult as Result<Submission>;
    if (Result.isError(accessTokenResult)) {
      const errorMessage = accessTokenResult.message.toLowerCase();

      if (errorMessage.includes("expired")) {
        return (
          <NotFoundComponent
            notFoundTitle="Token Expired"
            notFoundSubtitle="This link has expired"
            notFoundMessage="Please request a new access link to continue."
            titleSize="medium"
          />
        );
      }

      if (errorMessage.includes("permission") || errorMessage.includes("forbidden")) {
        return (
          <NotFoundComponent
            notFoundTitle="Access Denied"
            notFoundSubtitle="You don't have permission to access this submission"
            notFoundMessage="The access token does not have the required permissions."
            titleSize="medium"
          />
        );
      }

      return (
        <NotFoundComponent
          notFoundTitle="Submission Not Found"
          notFoundSubtitle="Unable to load submission"
          notFoundMessage="The submission may have been deleted or the token is invalid."
          titleSize="medium"
        />
      );
    }
    submission = accessTokenResult.value;
  } else {
    const partialResult = submissionResult as ApiResult<Submission>;
    submission = ApiResult.isSuccess(partialResult) ? partialResult.data : undefined;
  }

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
        <AssetStorageProvider>
          <SurveyJsWrapper
            formId={formId}
            definition={activeDefinition.jsonData}
            submission={submission}
            theme={activeDefinition.themeModel}
            customQuestions={activeDefinition.customQuestions}
            requiresReCaptcha={activeDefinition.requiresReCaptcha}
            urlToken={urlToken}
          />
        </AssetStorageProvider>
      </Suspense>
    </div>
  );
}

export default ShareSurveyPage;
