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
  searchParams: Promise<{ token?: string; heightMode?: string }>;
};

async function EmbedSurveyPage({ params, searchParams }: EmbedSurveyPage) {
  const { formId } = await params;
  const { token: urlToken, heightMode } = await searchParams;
  // Fill-mode layout/paint is cosmetic only (a loading-phase default, later
  // refined once the survey's real theme is known — see survey-component.tsx),
  // so it's fine to key it off heightMode alone here. Whether this is a
  // genuine embed.js load vs. a manually-typed URL isn't this page's call to
  // make — that check belongs to embed-messaging-context.ts, where embedId
  // is actually used for something (routing postMessage traffic).
  const isFillMode = isFillHeightMode(heightMode);

  if (urlToken) {
    if (!hasShareContinuationTokenPermission(urlToken)) {
      return (
        <NotFoundComponent
          notFoundTitle="Access Denied"
          notFoundSubtitle="You don't have permission to continue this submission"
          notFoundMessage="The access token does not include submit permissions."
        />
      );
    }
  }

  return (
    <div style={{ width: "100%" }}>
      {isFillMode && (
        <style>{`html, body { margin: 0; background-color: ${DEFAULT_FILL_BACKGROUND_COLOR}; }`}</style>
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
