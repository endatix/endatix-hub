"use client";

// Adapted from ReUI's Timeline (keenthemes/reui, MIT), same composition API. Hub changes:
// ordered-list semantics, a non-heading title by default, an `active` step on top of
// `completed`, and a compact size for panels. `DESIGN.md` §5 Timeline.

import { Slot } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type TimeHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type TimelineContextValue = {
  activeStep: number;
  setActiveStep: (step: number) => void;
};

const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined,
);

export function useTimeline(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimeline must be used within a Timeline");
  }
  return context;
}

interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  /** Steps up to and including this one are `completed`; this one is `active`. */
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  orientation?: "horizontal" | "vertical";
  /** `sm` tightens the gap between steps for panels and cards. */
  size?: "default" | "sm";
}

export function Timeline({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "vertical",
  size = "default",
  className,
  children,
  ...props
}: Readonly<TimelineProps>) {
  const [internalStep, setInternalStep] = useState(defaultValue);

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step);
      }
      onValueChange?.(step);
    },
    [value, onValueChange],
  );

  const activeStep = value ?? internalStep;
  const context = useMemo(
    () => ({ activeStep, setActiveStep }),
    [activeStep, setActiveStep],
  );

  return (
    <TimelineContext value={context}>
      <ol
        className={cn(
          "group/timeline flex [--timeline-gap:1.5rem] data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col data-[size=sm]:[--timeline-gap:1rem]",
          className,
        )}
        data-orientation={orientation}
        data-size={size}
        data-slot="timeline"
        {...props}
      >
        {children}
      </ol>
    </TimelineContext>
  );
}

interface TimelineItemProps extends HTMLAttributes<HTMLLIElement> {
  step: number;
}

export function TimelineItem({
  step,
  className,
  ...props
}: Readonly<TimelineItemProps>) {
  const { activeStep } = useTimeline();

  return (
    <li
      className={cn(
        "group/timeline-item relative flex min-w-0 flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-(--timeline-gap) has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-primary",
        className,
      )}
      data-active={step === activeStep || undefined}
      data-completed={step <= activeStep || undefined}
      data-slot="timeline-item"
      {...props}
    />
  );
}

export function TimelineHeader({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn(className)} data-slot="timeline-header" {...props} />
  );
}

interface TimelineDateProps extends TimeHTMLAttributes<HTMLTimeElement> {
  asChild?: boolean;
}

export function TimelineDate({
  asChild = false,
  className,
  ...props
}: Readonly<TimelineDateProps>) {
  const Comp = asChild ? Slot.Root : "time";

  return (
    <Comp
      className={cn(
        "mb-1 block text-xs font-medium text-muted-foreground tabular-nums group-data-[orientation=vertical]/timeline:max-sm:h-4",
        className,
      )}
      data-slot="timeline-date"
      {...props}
    />
  );
}

interface TimelineTitleProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Render a heading instead (`<TimelineTitle asChild><h3>…</h3></TimelineTitle>`). */
  asChild?: boolean;
}

/**
 * A `<p>` by default: timelines usually sit under a section heading already, and a
 * heading per step floods the page outline.
 */
export function TimelineTitle({
  asChild = false,
  className,
  ...props
}: Readonly<TimelineTitleProps>) {
  const Comp = asChild ? Slot.Root : "p";

  return (
    <Comp
      className={cn(
        // wrap-anywhere: unbroken paths must not set min-content (h1059), but
        // spaces still win — break-all would split words like "Viewed".
        "min-w-0 text-sm font-medium wrap-anywhere text-foreground",
        className,
      )}
      data-slot="timeline-title"
      {...props}
    />
  );
}

export function TimelineContent({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="timeline-content"
      {...props}
    />
  );
}

interface TimelineIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

/**
 * Ring for every step, primary ring once completed, filled for the active step.
 * Pass an icon as children for a step that needs a mark (`size-2.5`).
 */
export function TimelineIndicator({
  asChild = false,
  className,
  children,
  ...props
}: Readonly<TimelineIndicatorProps>) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      aria-hidden="true"
      className={cn(
        "absolute flex size-4 items-center justify-center rounded-full border-2 border-primary/20 text-primary-foreground group-data-[active]/timeline-item:bg-primary group-data-[completed]/timeline-item:border-primary group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-0 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2 [&_svg]:size-2.5",
        className,
      )}
      data-slot="timeline-indicator"
      {...props}
    >
      {children}
    </Comp>
  );
}

/** The connector to the next step. Primary once the next step is completed. */
export function TimelineSeparator({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute self-start bg-primary/10 group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-1rem-0.25rem)] group-data-[orientation=horizontal]/timeline:translate-x-4.5 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=vertical]/timeline:-translate-x-1/2 group-data-[orientation=vertical]/timeline:translate-y-4.5",
        className,
      )}
      data-slot="timeline-separator"
      {...props}
    />
  );
}
