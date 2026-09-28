import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import { PublicSurveySkeleton } from "@/features/public-form/ui/public-survey-skeleton";
import { hasShareContinuationTokenPermission } from "@/lib/utils";
import { ShieldX } from "lucide-react";
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
    if (!hasShareContinuationTokenPermission(urlToken)) {
      return (
        <PublicStatusPage
          icon={ShieldX}
          message="The access link does not include submit permissions."
          title="You can't continue this submission."
          tone="neutral"
          layout="page"
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
