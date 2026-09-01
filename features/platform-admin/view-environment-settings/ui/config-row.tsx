"use client";

import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConfigRowProps {
  label: string;
  value: ReactNode;
  nested?: boolean;
  tooltip?: string;
}

export function ConfigRow({
  label,
  value,
  nested = false,
  tooltip,
}: Readonly<ConfigRowProps>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        nested && "ml-1 border-l border-border pl-3",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 text-muted-foreground",
          nested && "text-xs",
        )}
      >
        {label}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground/70 hover:text-muted-foreground"
                  aria-label={`About ${label}`}
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
      <span className={cn("font-mono text-sm", nested && "text-xs")}>
        {value}
      </span>
    </div>
  );
}
