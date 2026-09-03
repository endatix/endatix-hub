"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
