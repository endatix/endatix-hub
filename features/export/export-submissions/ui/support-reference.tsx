"use client";

import { TruncatedId } from "@/components/common/truncated-id";

/** The API trace id a reader quotes to support; copying confirms inline so no toast covers the panel's actions. */
export function SupportReference({ traceId }: Readonly<{ traceId?: string }>) {
  if (!traceId) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      Support reference
      <TruncatedId
        id={traceId}
        className="text-foreground"
        copyLabel="Copy support reference"
        copyConfirmation="inline"
        tooltipAlign="end"
      />
    </div>
  );
}
