"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface CellCompleteStatusProps {
  isComplete: boolean;
}

export function CellCompleteStatus({ isComplete }: CellCompleteStatusProps) {
  const label = isComplete ? "Complete" : "Incomplete";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center"
            aria-label={label}
            role="img"
          >
            {isComplete ? (
              <CheckCircle2
                className={cn("size-4 text-emerald-600 dark:text-emerald-400")}
                aria-hidden="true"
              />
            ) : (
              <Circle
                className={cn("size-4 text-muted-foreground")}
                aria-hidden="true"
              />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
