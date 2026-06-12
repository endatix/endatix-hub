import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import "@/features/public-form/ui/already-responded-standalone.css";
import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import { PublicSurveySkeleton } from "@/features/public-form/ui/public-survey-skeleton";
import { hasShareContinuationTokenPermission } from "@/lib/utils";
import { Suspense } from "react";

type EmbedSurveyPage = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
};

async function EmbedSurveyPage({ params, searchParams }: EmbedSurveyPage) {
  const { formId } = await params;
  const { token: urlToken } = await searchParams;

  if (urlToken) {
    if (!hasShareContinuationTokenPermission(urlToken)) {
      return (
        <NotFoundComponent
          notFoundTitle="Access Denied"
          notFoundSubtitle="You don't have permission to continue this submission"
          notFoundMessage="The access token does not include submit permissions."
          titleSize="medium"
        />
      );
    }
  }

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <Suspense fallback={<PublicSurveySkeleton variant="embed" />}>
        <PublicSurveyContent
          formId={formId}
          urlToken={urlToken}
          variant="embed"
        />
      </Suspense>
    </div>
  );
}

export default EmbedSurveyPage;
