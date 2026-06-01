import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import "@/components/error-handling/not-found/not-found-styles-standalone.css";
import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import { PublicSurveySkeleton } from "@/features/public-form/ui/public-survey-skeleton";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
import { Suspense } from "react";
import styles from "./page.module.css";

type ShareSurveyPage = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
};

async function ShareSurveyPage({ params, searchParams }: ShareSurveyPage) {
  const { formId } = await params;
  const { token: urlToken } = await searchParams;

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

  return (
    <div className={styles.surveyPage}>
      <div className={styles.surveyContent}>
        <Suspense fallback={<PublicSurveySkeleton variant="share" />}>
          <PublicSurveyContent
            formId={formId}
            urlToken={urlToken}
            variant="share"
          />
        </Suspense>
      </div>
    </div>
  );
}

export default ShareSurveyPage;
