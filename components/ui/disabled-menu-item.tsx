"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DisabledMenuItem({
  label,
  tooltip,
  destructive,
}: {
  label: string;
  tooltip: string;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block" tabIndex={0}>
          <DropdownMenuItem
            disabled
            className={
              destructive
                ? "text-destructive focus:text-destructive"
                : undefined
            }
          >
            {label}
          </DropdownMenuItem>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
