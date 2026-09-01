"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The only three states a read-only configuration value is allowed to express.
 *
 * - `on` — the value is present / the feature is active.
 * - `off` — the value is absent or the feature is inactive, and that is fine.
 * - `attention` — something required is missing and the operator should act.
 */
export type ConfigStatusTone = "on" | "off" | "attention";

const TONE_VARIANT = {
  on: "success",
  off: "secondary",
  attention: "warning",
} as const;

interface ConfigStatusBadgeProps {
  tone: ConfigStatusTone;
  label: string;
  className?: string;
}

/**
 * One badge shape for every status on the Environment page. Tone carries the
 * meaning through color and a leading dot — never through a per-state icon —
 * so rows stay scannable down a single column.
 */
export function ConfigStatusBadge({
  tone,
  label,
  className,
}: Readonly<ConfigStatusBadgeProps>) {
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
