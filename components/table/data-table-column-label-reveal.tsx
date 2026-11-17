"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useId, useState, type MouseEvent, type PointerEvent } from "react";
import { dataTableColumnLabelClassName } from "./data-table-chrome";

const LABEL_BUTTON_CLASS_NAME = dataTableColumnLabelClassName(
  "block max-w-full cursor-help rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
);

interface DataTableColumnLabelRevealProps {
  readonly label: string;
  /** The full text behind a short label, e.g. a question's title behind its name. */
  readonly description: string;
}

/**
 * A column label that reveals its description on hover, keyboard focus and tap.
 * The description stays linked (`aria-describedby`) while the tooltip is closed.
 */
export function DataTableColumnLabelReveal({
  label,
  description,
}: DataTableColumnLabelRevealProps) {
  const descriptionId = useId();
  return (
    <TooltipProvider delayDuration={200}>
      <LabelTooltip {...{ label, description, descriptionId }} />
      <span id={descriptionId} hidden>
        {description}
      </span>
    </TooltipProvider>
  );
}

type LabelTooltipProps = DataTableColumnLabelRevealProps & {
  readonly descriptionId: string;
};

function LabelTooltip(props: LabelTooltipProps) {
  const { open, setOpen, openOnTap } = useTapToOpen();
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        aria-describedby={props.descriptionId}
        className={LABEL_BUTTON_CLASS_NAME}
        onPointerDown={keepTouchOpen}
        onClick={openOnTap}
      >
        {props.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{props.description}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Radix closes a tooltip on a trigger click and never opens one on touch, so a
 * tap opens it here; `preventDefault` skips Radix's close.
 */
function useTapToOpen() {
  const [open, setOpen] = useState(false);
  const openOnTap = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };
  return { open, setOpen, openOnTap };
}

function keepTouchOpen(event: PointerEvent<HTMLButtonElement>): void {
  if (event.pointerType === "touch") {
    event.preventDefault();
  }
}
