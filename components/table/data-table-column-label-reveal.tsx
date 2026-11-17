"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useId, useState, type PointerEvent } from "react";
import { dataTableColumnLabelClassName } from "./data-table-chrome";

interface DataTableColumnLabelRevealProps {
  readonly label: string;
  /** The full text behind a short label, e.g. a question's title behind its name. */
  readonly description: string;
}

/**
 * A column label that reveals its description on hover, keyboard focus and tap.
 * Radix closes a tooltip on a touch pointer-down and click, so a tap opens it here.
 */
export function DataTableColumnLabelReveal({
  label,
  description,
}: DataTableColumnLabelRevealProps) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-describedby={descriptionId}
            className={dataTableColumnLabelClassName(
              "block max-w-full cursor-help rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
            onPointerDown={keepTouchOpen}
            onClick={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{description}</TooltipContent>
      </Tooltip>
      <span id={descriptionId} hidden>
        {description}
      </span>
    </TooltipProvider>
  );
}

function keepTouchOpen(event: PointerEvent<HTMLButtonElement>): void {
  if (event.pointerType === "touch") {
    event.preventDefault();
  }
}
