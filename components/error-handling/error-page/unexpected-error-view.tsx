'use client';

import { ErrorPage } from './error-page';
import { Button } from '@/components/ui/button';
import { useTrackEvent } from '@/features/analytics/posthog';
import {
  buildUnexpectedErrorDiagnostics,
  formatUnexpectedErrorClipboard,
  getUnexpectedErrorUi,
  type UnexpectedErrorDiagnostics,
} from '@/lib/errors/unexpected-error-ui';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface UnexpectedErrorViewProps {
  error: Error & { digest?: string };
  retry: () => void;
  diagnostics?: UnexpectedErrorDiagnostics;
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
  const [isCopied, setIsCopied] = useState(false);
  const ui = getUnexpectedErrorUi(error);
  const resolvedDiagnostics = diagnostics ?? buildUnexpectedErrorDiagnostics(error);

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

  const handleCopyDiagnostics = async () => {
    if (!navigator?.clipboard) {
      return;
    }

    const payload = formatUnexpectedErrorClipboard(resolvedDiagnostics, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      statusLabel: ui.statusCode,
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });

    await navigator.clipboard.writeText(payload);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <ErrorPage
      statusCode={ui.statusCode}
      title={ui.title}
      subtitle={ui.subtitle}
      message={ui.message}
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>
          <RotateCcw className="size-4 shrink-0" />
          Try Again
        </Button>
        <Button variant="outline" onClick={handleCopyDiagnostics}>
          {isCopied ? (
            <>
              <Check className="size-4 shrink-0" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4 shrink-0" />
              Copy Diagnostics
            </>
          )}
        </Button>
      </div>
      <div className="rounded-lg bg-surface-container-lowest p-4 text-sm text-muted-foreground shadow-[0_8px_30px_rgb(0,52,94,0.06)] outline outline-primary/15">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Support reference
        </p>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
              Digest
            </dt>
            <dd className="font-mono text-foreground">
              {resolvedDiagnostics.digest ?? 'N/A'}
            </dd>
          </div>
          {resolvedDiagnostics.traceId ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Trace ID
              </dt>
              <dd className="font-mono text-foreground">
                {resolvedDiagnostics.traceId}
              </dd>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">
              No API trace ID — the request may not have reached the server.
            </p>
          )}
          {resolvedDiagnostics.errorCode ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Error code
              </dt>
              <dd className="font-mono text-foreground">
                {resolvedDiagnostics.errorCode}
              </dd>
            </div>
          ) : null}
          {process.env.NODE_ENV === 'development' && error.message ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Details
              </dt>
              <dd className="font-mono text-foreground break-all">
                {error.message}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </ErrorPage>
  );
}
