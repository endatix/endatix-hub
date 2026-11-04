"use client";

import { LoadErrorView } from "./result-load-error-view";
import { useTrackEvent } from "@/features/analytics/posthog";
import {
  buildUnexpectedErrorDiagnostics,
  getUnexpectedErrorUi,
  type UnexpectedErrorDiagnostics,
  withClientErrorId,
} from "@/lib/errors/unexpected-error-ui";
import { useEffect, useMemo } from "react";

export interface UnexpectedErrorViewProps {
  error: Error & { digest?: string };
  retry: () => void;
  diagnostics?: UnexpectedErrorDiagnostics;
}

/** Every boundary error gets an id to quote: its own, or one minted for a client error. */
function resolveDiagnostics(
  error: Error & { digest?: string },
  diagnostics: UnexpectedErrorDiagnostics | undefined,
): UnexpectedErrorDiagnostics {
  return withClientErrorId(
    diagnostics ?? buildUnexpectedErrorDiagnostics(error),
    error,
  );
}

/** What the exception is reported with: every support id the page shows, and when. */
function exceptionProperties(
  error: Error & { digest?: string },
  diagnostics: UnexpectedErrorDiagnostics,
): Record<string, string | number | boolean | null> {
  const ids = {
    digest: error.digest,
    errorCode: diagnostics.errorCode,
    statusCode: diagnostics.statusCode,
    traceId: diagnostics.traceId,
    clientErrorId: diagnostics.clientErrorId,
  };
  const present = Object.entries(ids).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  return {
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(present),
  };
}

/**
 * Client UI for Next.js `error.tsx` / `global-error.tsx` boundaries.
 */
export function UnexpectedErrorView({
  error,
  retry,
  diagnostics,
}: Readonly<UnexpectedErrorViewProps>) {
  const { trackException } = useTrackEvent();
  const ui = getUnexpectedErrorUi(error);
  // Derived from `error`, so it must be memoised on it: an object rebuilt every
  // render is a new dependency every render, and the effect below would report the
  // same exception again on each re-render of the boundary.
  const resolvedDiagnostics = useMemo(
    () => resolveDiagnostics(error, diagnostics),
    [diagnostics, error],
  );

  useEffect(() => {
    trackException(error, exceptionProperties(error, resolvedDiagnostics));
  }, [error, resolvedDiagnostics, trackException]);

  return (
    <LoadErrorView
      ui={ui}
      diagnostics={resolvedDiagnostics}
      details={error.message}
      onRetry={retry}
    />
  );
}
