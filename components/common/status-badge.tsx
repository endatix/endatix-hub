"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "on" | "off" | "attention" | "idle";

const TONE_VARIANT = {
  on: "success",
  off: "secondary",
  attention: "warning",
  idle: "info",
} as const;

const TONE_TEXT = {
  on: "text-success",
  off: "text-secondary-foreground",
  attention: "text-warning",
  idle: "text-info",
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

export function StatusDot({
  tone,
  className,
}: Readonly<{ tone: StatusTone; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      data-tone={tone}
      className={cn(
        "size-2 shrink-0 rounded-full bg-current",
        TONE_TEXT[tone],
        className,
      )}
    />
  );
}
