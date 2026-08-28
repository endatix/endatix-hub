'use client';

import { ErrorPage } from './error-page';
import { Button } from '@/components/ui/button';
import { useTrackEvent } from '@/features/analytics/posthog';
import {
  buildUnexpectedErrorDiagnostics,
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

    const lines = [
      `Digest: ${resolvedDiagnostics.digest ?? 'N/A'}`,
      `Trace ID: ${resolvedDiagnostics.traceId ?? 'N/A'}`,
      `Error code: ${resolvedDiagnostics.errorCode ?? 'N/A'}`,
      `HTTP status: ${resolvedDiagnostics.statusCode ?? ui.statusCode}`,
      `Path: ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}`,
      `Timestamp: ${new Date().toISOString()}`,
    ];

    if (process.env.NODE_ENV === 'development' && error.message) {
      lines.push(`Details: ${error.message}`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
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
      <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold tracking-wide uppercase">Digest:</span>{' '}
          <span className="font-mono">{resolvedDiagnostics.digest ?? 'N/A'}</span>
        </p>
        {resolvedDiagnostics.traceId ? (
          <p className="mt-2">
            <span className="font-semibold tracking-wide uppercase">
              Trace ID:
            </span>{' '}
            <span className="font-mono">{resolvedDiagnostics.traceId}</span>
          </p>
        ) : null}
        {resolvedDiagnostics.errorCode ? (
          <p className="mt-2">
            <span className="font-semibold tracking-wide uppercase">
              Error code:
            </span>{' '}
            <span className="font-mono">{resolvedDiagnostics.errorCode}</span>
          </p>
        ) : null}
        {process.env.NODE_ENV === 'development' && error.message ? (
          <p className="mt-2">
            <span className="font-semibold">Details:</span>{' '}
            <span className="font-mono">{error.message}</span>
          </p>
        ) : null}
      </div>
    </ErrorPage>
  );
}
