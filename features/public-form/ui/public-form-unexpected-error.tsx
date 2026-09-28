"use client";

import {
  PublicStatusPage,
  publicStatusClassNames,
} from "@/components/public-status/public-status-page";
import { PublicStatusReference } from "@/components/public-status/public-status-reference";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import type { PublicSurveyVariant } from "@/features/public-form/types";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export interface PublicFormUnexpectedErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
  variant: PublicSurveyVariant;
}

/**
 * Error boundary UI for `/share` and `/embed`. Without it a crash falls through to
 * the Hub `app/error.tsx` — sheep, diagnostics card and Tailwind classes these
 * routes never load. The digest stays as a support reference; `error.message` never
 * reaches a respondent.
 */
export function PublicFormUnexpectedError({
  error,
  retry,
  variant,
}: Readonly<PublicFormUnexpectedErrorProps>) {
  const { trackException } = useTrackEvent();

  useEffect(() => {
    trackException(error, {
      timestamp: new Date().toISOString(),
      surface: `public-form-${variant}`,
      ...(error.digest ? { digest: error.digest } : {}),
    });
  }, [error, trackException, variant]);

  return (
    <>
      {variant === "embed" && <EmbedHeightReporter />}
      <PublicStatusPage
        icon={TriangleAlert}
        layout={variant === "embed" ? "embed" : "page"}
        message="Please try again in a moment."
        title="Something went wrong"
        tone="warning"
      >
        <button
          className={publicStatusClassNames.action}
          onClick={retry}
          type="button"
        >
          Try again
        </button>
        {error.digest ? (
          <PublicStatusReference reference={error.digest} />
        ) : null}
      </PublicStatusPage>
    </>
  );
}
