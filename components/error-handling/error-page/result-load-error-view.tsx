"use client";

import { ErrorPage } from "./error-page";
import { TruncatedId } from "@/components/common/truncated-id";
import { Button } from "@/components/ui/button";
import {
  diagnosticsFromResult,
  formatUnexpectedErrorClipboard,
  unexpectedErrorUiFromResult,
  type UnexpectedErrorDiagnostics,
  type UnexpectedErrorUi,
} from "@/lib/errors/unexpected-error-ui";
import type { Error as ResultError } from "@/lib/result";
import { Check, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

export interface LoadErrorViewProps {
  ui: UnexpectedErrorUi;
  diagnostics: UnexpectedErrorDiagnostics;
  /** Dev-only detail string (e.g. Result.message). Never shown in production. */
  details?: string;
  onRetry: () => void;
}

/**
 * Shared chrome for API/loader failures kept as `Result` (not thrown into error.tsx).
 */
export function LoadErrorView({
  ui,
  diagnostics,
  details,
  onRetry,
}: Readonly<LoadErrorViewProps>) {
  const [isCopied, setIsCopied] = useState(false);
  const showDevDetails =
    process.env.NODE_ENV === "development" && Boolean(details);

  const handleCopyDiagnostics = async () => {
    if (!navigator?.clipboard) {
      return;
    }

    const payload = formatUnexpectedErrorClipboard(diagnostics, {
      path:
        typeof window !== "undefined" ? window.location.pathname : undefined,
      statusLabel: ui.code,
      details: showDevDetails ? details : undefined,
    });

    await navigator.clipboard.writeText(payload);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <ErrorPage {...ui}>
      <div className="flex flex-wrap justify-center gap-3">
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
      <div className="w-full max-w-md rounded-lg bg-surface-container-lowest p-4 text-left text-sm text-muted-foreground shadow-[0_8px_30px_rgb(0,52,94,0.06)] outline outline-primary/15">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Support reference
        </p>
        <dl className="mt-3 space-y-2">
          <DiagnosticRow label="Digest">
            {diagnostics.digest ? (
              <TruncatedId id={diagnostics.digest} copyLabel="Copy Digest" />
            ) : null}
          </DiagnosticRow>
          <DiagnosticRow label="Trace ID">
            {diagnostics.traceId ? (
              <TruncatedId
                id={diagnostics.traceId}
                visibleChars={8}
                copyLabel="Copy Trace ID"
              />
            ) : null}
          </DiagnosticRow>
          <DiagnosticRow label="Error code">
            {diagnostics.errorCode ? (
              <span className="font-mono">{diagnostics.errorCode}</span>
            ) : null}
          </DiagnosticRow>
          {showDevDetails ? (
            <DiagnosticRow label="Details">
              <span className="font-mono break-all">{details}</span>
            </DiagnosticRow>
          ) : null}
        </dl>
      </div>
    </ErrorPage>
  );
}

/**
 * One support-reference row. An absent value reads as a blank on a form (a dash),
 * not as a sentence explaining what the page does not have.
 */
function DiagnosticRow({
  label,
  children,
}: Readonly<{ label: string; children?: React.ReactNode }>) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </dt>
      <dd className="text-foreground">
        {children ?? <span aria-label="Not available">&mdash;</span>}
      </dd>
    </div>
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
    />
  );
}
