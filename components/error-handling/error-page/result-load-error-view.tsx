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

    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Clipboard permission can be denied (or the page is not a secure context).
      // A rejected write must not surface as an unhandled rejection on an error page.
      return;
    }

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
      <SupportReference
        diagnostics={diagnostics}
        details={showDevDetails ? details : undefined}
      />
    </ErrorPage>
  );
}

/** The ids support asks for, and the message in development. */
function SupportReference({
  diagnostics,
  details,
}: Readonly<{ diagnostics: UnexpectedErrorDiagnostics; details?: string }>) {
  return (
    <div className="w-full max-w-md rounded-lg bg-surface-container-lowest p-4 text-left text-sm text-muted-foreground shadow-[0_8px_30px_rgb(0,52,94,0.06)] outline outline-primary/15">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Support reference
      </p>
      <dl className="mt-3 space-y-2">
        <SupportIds diagnostics={diagnostics} />
        {details ? (
          <DiagnosticRow label="Details">
            <span className="font-mono break-all">{details}</span>
          </DiagnosticRow>
        ) : null}
      </dl>
    </div>
  );
}

/** Digest and Trace ID come from the server or the API; a client error gets an Error ID. */
function SupportIds({
  diagnostics,
}: Readonly<{ diagnostics: UnexpectedErrorDiagnostics }>) {
  return (
    <>
      <IdRow label="Digest" id={diagnostics.digest} />
      <IdRow label="Trace ID" id={diagnostics.traceId} visibleChars={8} />
      <ErrorIdRow id={diagnostics.clientErrorId} />
      <DiagnosticRow label="Error code">
        {diagnostics.errorCode ? (
          <span className="font-mono">{diagnostics.errorCode}</span>
        ) : null}
      </DiagnosticRow>
    </>
  );
}

/** Only a client error has one, so the row is left out, not blanked, otherwise. */
function ErrorIdRow({ id }: Readonly<{ id?: string }>) {
  return id ? <IdRow label="Error ID" id={id} visibleChars={8} /> : null;
}

/** A copyable id row, blank when the id is missing. */
function IdRow({
  label,
  id,
  visibleChars,
}: Readonly<{ label: string; id?: string; visibleChars?: number }>) {
  return (
    <DiagnosticRow label={label}>
      {id ? (
        <TruncatedId
          id={id}
          visibleChars={visibleChars}
          copyLabel={`Copy ${label}`}
        />
      ) : null}
    </DiagnosticRow>
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
