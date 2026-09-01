"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SecretPresence } from "../types";

interface SecretPresenceBadgeProps {
  presence: SecretPresence;
  /** Optional env var name shown in the tooltip for operators. */
  envVar?: string;
}

export function SecretPresenceBadge({
  presence,
  envVar,
}: Readonly<SecretPresenceBadgeProps>) {
  const badge = (
    <Badge variant={presence.configured ? "secondary" : "outline"}>
      {presence.configured ? "Set" : "Not set"}
    </Badge>
  );

  const tooltip = envVar
    ? `Value is not shown. Configure via ${envVar} at deploy time.`
    : "Value is not shown. Change via deployment env.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
