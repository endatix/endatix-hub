"use client";

import type { ReactNode } from "react";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
}

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
