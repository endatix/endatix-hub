import {
  DEFAULT_FILL_BACKGROUND_COLOR,
  isFillHeightMode,
} from "@/features/embed-form/height-mode";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import { PublicSurveySkeleton } from "@/features/public-form/ui/public-survey-skeleton";
import { hasShareContinuationTokenPermission } from "@/lib/utils";
import { ShieldX } from "lucide-react";
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
        <>
          <EmbedHeightReporter />
          <PublicStatusPage
            icon={ShieldX}
            message="The access link does not include submit permissions."
            title="You can't continue this submission."
            tone="neutral"
            layout="embed"
          />
        </>
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
