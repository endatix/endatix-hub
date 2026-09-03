"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelStepsProps {
  steps: readonly string[];
  /** 1-based position of the active step. */
  current: number;
  className?: string;
}

type StepStatus = "complete" | "current" | "upcoming";

const STEP_STATUS = {
  complete: {
    srLabel: " (completed)",
    marker: "bg-primary/12 text-primary",
    label: "text-muted-foreground",
    connector: "bg-primary/30",
  },
  current: {
    srLabel: " (current step)",
    marker: "bg-primary text-primary-foreground",
    label: "font-medium text-foreground",
    connector: "bg-border",
  },
  upcoming: {
    srLabel: "",
    marker: "bg-muted text-muted-foreground",
    label: "text-muted-foreground",
    connector: "bg-border",
  },
} as const satisfies Record<StepStatus, unknown>;

function stepStatus(position: number, current: number): StepStatus {
  if (position < current) {
    return "complete";
  }

  return position === current ? "current" : "upcoming";
}

/** Progress through a multi-step overlay, as a track rather than prose (DESIGN.md §6). */
export function PanelSteps({
  steps,
  current,
  className,
}: Readonly<PanelStepsProps>) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((label, index) => {
        const position = index + 1;
        const status = stepStatus(position, current);
        const style = STEP_STATUS[status];

        return (
          <li
            key={label}
            aria-current={status === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                style.marker,
              )}
            >
              {status === "complete" ? (
                <Check className="size-3.5" />
              ) : (
                position
              )}
            </span>
            <span className={cn("truncate text-xs", style.label)}>
              {label}
              <span className="sr-only">{style.srLabel}</span>
            </span>
            {position < steps.length && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px min-w-2 flex-1 rounded-full",
                  style.connector,
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
