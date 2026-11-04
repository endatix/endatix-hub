"use client";

import { useEffect, useRef } from "react";
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

/**
 * A new step starts at the top: the panel body is shared by every step, so without this a step
 * opens at the scroll position the previous one was left at.
 */
function useScrollToStart(current: number) {
  const ref = useRef<HTMLOListElement>(null);
  const shown = useRef(current);
  useEffect(() => {
    if (shown.current === current) return;
    shown.current = current;
    ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [current]);
  return ref;
}

type StepItemProps = {
  label: string;
  position: number;
  current: number;
  last: boolean;
};

function StepMarker({
  status,
  position,
}: Readonly<{ status: StepStatus; position: number }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
        STEP_STATUS[status].marker,
      )}
    >
      {status === "complete" ? <Check className="size-3.5" /> : position}
    </span>
  );
}

function StepConnector({ className }: Readonly<{ className: string }>) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-px min-w-2 flex-1 rounded-full", className)}
    />
  );
}

function StepItem({ label, position, current, last }: Readonly<StepItemProps>) {
  const status = stepStatus(position, current);
  const style = STEP_STATUS[status];
  return (
    <li
      aria-current={status === "current" ? "step" : undefined}
      className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
    >
      <StepMarker status={status} position={position} />
      <span className={cn("truncate text-xs", style.label)}>
        {label}
        <span className="sr-only">{style.srLabel}</span>
      </span>
      {last ? null : <StepConnector className={style.connector} />}
    </li>
  );
}

export function PanelSteps({
  steps,
  current,
  className,
}: Readonly<PanelStepsProps>) {
  const ref = useScrollToStart(current);
  return (
    <ol ref={ref} className={cn("flex items-center gap-2", className)}>
      {steps.map((label, index) => (
        <StepItem
          key={label}
          label={label}
          position={index + 1}
          current={current}
          last={index === steps.length - 1}
        />
      ))}
    </ol>
  );
}
