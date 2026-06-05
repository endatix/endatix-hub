"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DisabledMenuItemProps {
  label: string;
  tooltip: string;
  destructive?: boolean;
}

export function DisabledMenuItem({
  label,
  tooltip,
  destructive,
}: Readonly<DisabledMenuItemProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">
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
