"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelStepsProps {
  steps: readonly string[];
  /** 1-based position of the active step. */
  current: number;
  className?: string;
}

/**
 * Progress through a multi-step overlay.
 *
 * Rendered as a labelled track rather than a sentence: "Step 2 of 3" inside the
 * description tells the reader where they are only after they read the prose,
 * and never tells them what is still ahead or what they already settled.
 */
export function PanelSteps({
  steps,
  current,
  className,
}: Readonly<PanelStepsProps>) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((label, index) => {
        const position = index + 1;
        const isComplete = position < current;
        const isCurrent = position === current;

        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                isCurrent && "bg-primary text-primary-foreground",
                isComplete && "bg-primary/12 text-primary",
                !isCurrent && !isComplete && "bg-muted text-muted-foreground",
              )}
            >
              {isComplete ? <Check className="size-3.5" /> : position}
            </span>
            <span
              className={cn(
                "truncate text-xs",
                isCurrent
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
              <span className="sr-only">
                {isComplete
                  ? " (completed)"
                  : isCurrent
                    ? " (current step)"
                    : ""}
              </span>
            </span>
            {position < steps.length && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px min-w-2 flex-1 rounded-full",
                  isComplete ? "bg-primary/30" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
