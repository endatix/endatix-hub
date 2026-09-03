"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The only three states a read-only value is allowed to express (DESIGN.md §5).
 *
 * - `on` — present / active / healthy.
 * - `off` — absent or inactive, and that is a legitimate state.
 * - `attention` — something required is missing and the operator should act.
 *
 * `destructive` is deliberately absent: it is reserved for a state that is
 * actively failing, not for "empty".
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

/**
 * One badge shape for every status in the Hub. Tone carries the meaning through
 * colour and a leading dot — never through a per-state icon — so a column of
 * them stays scannable in one pass.
 */
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
