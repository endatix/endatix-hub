"use client";

import { LoadErrorView } from "./result-load-error-view";
import { useTrackEvent } from "@/features/analytics/posthog";
import {
  buildUnexpectedErrorDiagnostics,
  getUnexpectedErrorUi,
  type UnexpectedErrorDiagnostics,
  withClientTraceId,
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
  return withClientTraceId(
    diagnostics ?? buildUnexpectedErrorDiagnostics(error),
    error,
  );
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
    const properties: Record<string, string | number | boolean | null> = {
      timestamp: new Date().toISOString(),
    };
    if (error.digest) {
      properties.digest = error.digest;
    }
    if (resolvedDiagnostics.errorCode) {
      properties.errorCode = resolvedDiagnostics.errorCode;
    }
    if (resolvedDiagnostics.statusCode !== undefined) {
      properties.statusCode = resolvedDiagnostics.statusCode;
    }
    if (resolvedDiagnostics.traceId) {
      properties.traceId = resolvedDiagnostics.traceId;
    }
    trackException(error, properties);
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
