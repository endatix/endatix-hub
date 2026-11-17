"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useId,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
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
 * A column label that reveals itself in full, then its description, on hover,
 * keyboard focus and tap (a second tap closes it).
 * Closed, the label is described by a hidden copy; open, Radix links the tooltip.
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
  const { open, setOpen, onPointerDown, onClick } = useTapToggle();
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        aria-describedby={open ? undefined : props.descriptionId}
        className={LABEL_BUTTON_CLASS_NAME}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {props.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <span className="font-semibold">{props.label}</span> —{" "}
        {props.description}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Radix closes a tooltip on a trigger press and never opens one on touch, so a
 * click toggles it here from the state it had when pressed (focus may open it
 * in between); `preventDefault` skips Radix's own close.
 */
function useTapToggle() {
  const [open, setOpen] = useState(false);
  const openWhenPressed = useRef<boolean | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    openWhenPressed.current = open;
    if (event.pointerType === "touch") event.preventDefault();
  };
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(!(openWhenPressed.current ?? open));
    openWhenPressed.current = null;
  };
  return { open, setOpen, onPointerDown, onClick };
}
