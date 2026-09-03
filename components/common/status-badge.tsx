"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The only states a read-only value may express (DESIGN.md §5). `destructive`
 * is deliberately absent — it means actively failing, not empty.
 */
export type StatusTone = "on" | "off" | "attention";

const TONE_VARIANT = {
  on: "success",
  off: "secondary",
  attention: "warning",
} as const;

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

/** One badge shape for every status in the Hub — table cell, panel header, review row. */
export function StatusBadge({
  tone,
  label,
  className,
}: Readonly<StatusBadgeProps>) {
  return (
    <Badge
      variant={TONE_VARIANT[tone]}
      data-tone={tone}
      className={cn("gap-1.5 px-2.5 py-1", className)}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
