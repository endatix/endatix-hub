"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_VISIBLE_CHARS = 4;
const ELLIPSIS = "\u2026";

export function truncateId(
  id: string,
  visibleChars: number = DEFAULT_VISIBLE_CHARS,
): string {
  const trimmed = id.trim();
  if (trimmed.length <= visibleChars * 2) {
    return trimmed;
  }

  return `${trimmed.slice(0, visibleChars)}${ELLIPSIS}${trimmed.slice(-visibleChars)}`;
}

interface TruncatedIdProps {
  id: string;
  emptyLabel?: string;
  visibleChars?: number;
  className?: string;
  copyLabel?: string;
}

export function TruncatedId({
  id,
  emptyLabel = "N/A",
  visibleChars = DEFAULT_VISIBLE_CHARS,
  className,
  copyLabel = "Copy ID",
}: TruncatedIdProps) {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyLabel}
      </span>
    );
  }

  const displayValue = truncateId(trimmed, visibleChars);
  const isTruncated = displayValue !== trimmed;

  const idText = (
    <span className="font-mono text-sm tabular-nums">{displayValue}</span>
  );

  return (
    <div
      className={cn("group flex max-w-full items-center gap-0.5", className)}
    >
      {isTruncated ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{idText}</TooltipTrigger>
            <TooltipContent>
              <span className="font-mono text-xs">{trimmed}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        idText
      )}
      <CopyToClipboard
        copyValue={trimmed}
        label={copyLabel}
        layout="inline"
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        buttonClassName="size-5"
      />
    </div>
  );
}
