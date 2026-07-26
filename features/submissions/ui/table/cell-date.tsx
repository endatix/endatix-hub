"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPreciseDateTime,
  formatRelativeOrCompactDateTime,
  toValidDate,
} from "@/lib/date-utils";

interface CellDateProps {
  date?: Date;
  visible?: boolean;
}

export function CellDate({ date, visible = true }: Readonly<CellDateProps>) {
  if (!visible) {
    return null;
  }

  const parsedDate = toValidDate(date ?? null);
  if (parsedDate === null) {
    return <span className="font-normal text-muted-foreground">-</span>;
  }

  const displayValue = formatRelativeOrCompactDateTime(parsedDate);
  const preciseValue = formatPreciseDateTime(parsedDate);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-normal whitespace-nowrap">{displayValue}</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="text-xs">{preciseValue}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
