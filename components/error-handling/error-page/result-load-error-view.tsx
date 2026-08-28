'use client';

import { ErrorPage } from './error-page';
import { Button } from '@/components/ui/button';
import {
  diagnosticsFromResult,
  formatUnexpectedErrorClipboard,
  unexpectedErrorUiFromResult,
  type UnexpectedErrorDiagnostics,
  type UnexpectedErrorUi,
} from '@/lib/errors/unexpected-error-ui';
import type { Error as ResultError } from '@/lib/result';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export interface LoadErrorViewProps {
  ui: UnexpectedErrorUi;
  diagnostics: UnexpectedErrorDiagnostics;
  /** Dev-only detail string (e.g. Result.message). Never shown in production. */
  details?: string;
  onRetry: () => void;
  /** When true, omit Digest row (Result path has no Next digest). */
  hideDigest?: boolean;
}

/**
 * Shared chrome for API/loader failures kept as `Result` (not thrown into error.tsx).
 */
export function LoadErrorView({
  ui,
  diagnostics,
  details,
  onRetry,
  hideDigest = false,
}: Readonly<LoadErrorViewProps>) {
  const [isCopied, setIsCopied] = useState(false);
  const showDevDetails =
    process.env.NODE_ENV === 'development' && Boolean(details);

  const handleCopyDiagnostics = async () => {
    if (!navigator?.clipboard) {
      return;
    }

    const payload = formatUnexpectedErrorClipboard(diagnostics, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      statusLabel: ui.statusCode,
      details: showDevDetails ? details : undefined,
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
        <Button onClick={onRetry}>
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
          {!hideDigest ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Digest
              </dt>
              <dd className="font-mono text-foreground">
                {diagnostics.digest ?? 'N/A'}
              </dd>
            </div>
          ) : null}
          {diagnostics.traceId ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Trace ID
              </dt>
              <dd className="font-mono text-foreground">
                {diagnostics.traceId}
              </dd>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">
              No API trace ID on this error.
            </p>
          )}
          {diagnostics.errorCode ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Error code
              </dt>
              <dd className="font-mono text-foreground">
                {diagnostics.errorCode}
              </dd>
            </div>
          ) : null}
          {showDevDetails ? (
            <div>
              <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
                Details
              </dt>
              <dd className="font-mono text-foreground break-all">{details}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </ErrorPage>
  );
}

export interface ResultLoadErrorViewProps {
  result: ResultError;
  onRetry: () => void;
}

/**
 * Renders a load failure kept as Hub `Result` so ProblemDetails `traceId` survives.
 */
export function ResultLoadErrorView({
  result,
  onRetry,
}: Readonly<ResultLoadErrorViewProps>) {
  const ui = unexpectedErrorUiFromResult(result);
  const diagnostics = diagnosticsFromResult(result);

  return (
    <LoadErrorView
      ui={ui}
      diagnostics={diagnostics}
      details={result.message}
      onRetry={onRetry}
      hideDigest
    />
  );
}
