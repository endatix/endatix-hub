"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ConfigRowProps {
  label: string;
  /**
   * Environment variable this row resolves from. Shown inline under the label:
   * on a page whose purpose is reviewing env config, the variable name is the
   * operator's primary key — it does not belong behind a tooltip.
   */
  envVar?: string;
  value: ReactNode;
  /** Renders the row as a detail of the row above it. */
  nested?: boolean;
}

/**
 * One label/value pair. Label block on the left, value column hard right so
 * every status in a section lines up and can be scanned in one pass.
 */
export function ConfigRow({
  label,
  envVar,
  value,
  nested = false,
}: Readonly<ConfigRowProps>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-1",
        nested && "pl-4",
      )}
    >
      <dt className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "text-sm text-foreground",
            nested && "text-xs text-muted-foreground",
          )}
        >
          {label}
        </span>
        {envVar && (
          <span className="font-mono text-xs leading-none text-on-surface-variant">
            {envVar}
          </span>
        )}
      </dt>
      <dd className="flex min-w-0 items-center justify-end text-right">
        {value}
      </dd>
    </div>
  );
}
