import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import "@/features/public-form/ui/already-responded-standalone.css";
import {
  DEFAULT_FILL_BACKGROUND_COLOR,
  isFillHeightMode,
} from "@/features/embed-form/height-mode";
import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import { PublicSurveySkeleton } from "@/features/public-form/ui/public-survey-skeleton";
import { hasShareContinuationTokenPermission } from "@/lib/utils";
import { Suspense } from "react";

type EmbedSurveyPage = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    token?: string;
    heightMode?: string;
    embedId?: string;
  }>;
};

async function EmbedSurveyPage({ params, searchParams }: EmbedSurveyPage) {
  const { formId } = await params;
  const { token: urlToken, heightMode, embedId } = await searchParams;
  // Only apply fill-mode layout when this looks like a genuine embed.js load
  // (it always sets embedId), not a direct/manual ?heightMode=fill visit.
  const isFillMode = isFillHeightMode(heightMode) && Boolean(embedId);

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
        height: isFillMode ? "100%" : undefined,
      }}
    >
      {isFillMode && (
        <style>{`html, body { height: 100%; margin: 0; background-color: ${DEFAULT_FILL_BACKGROUND_COLOR}; }`}</style>
      )}
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
