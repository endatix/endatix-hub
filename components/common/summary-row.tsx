"use client";

import type { ReactNode } from "react";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
}

/**
 * One label/value pair in a review step. Label left, value hard right, so every
 * value in a summary aligns into a single scannable column — the same anatomy
 * as `ConfigRow` on the read-only settings pages (DESIGN.md §6).
 */
export function SummaryRow({ label, value }: Readonly<SummaryRowProps>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end text-right text-sm font-medium break-words">
        {value}
      </dd>
    </div>
  );
}
