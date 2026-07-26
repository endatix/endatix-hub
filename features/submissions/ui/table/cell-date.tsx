"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCompactDateTime,
  formatPreciseDateTime,
  formatRelativeOrCompactDateTime,
  toValidDate,
} from "@/lib/date-utils";
import { useEffect, useState } from "react";

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

  return <CellDateValue date={parsedDate} />;
}

function CellDateValue({ date }: { readonly date: Date }) {
  // SSR + first paint: compact absolute (UTC). After mount: relative when recent.
  const [displayValue, setDisplayValue] = useState(() =>
    formatCompactDateTime(date),
  );
  const preciseValue = formatPreciseDateTime(date);

  useEffect(() => {
    setDisplayValue(formatRelativeOrCompactDateTime(date, new Date()));
  }, [date]);

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
