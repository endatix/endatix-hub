"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DisabledButtonProps = Omit<
  ComponentProps<typeof Button>,
  "disabled"
> & {
  tooltip: string;
};

export function DisabledButton({
  children,
  tooltip,
  ...props
}: Readonly<DisabledButtonProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button {...props} disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
