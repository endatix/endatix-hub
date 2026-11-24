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
const HOVER_REVEAL =
  "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[output]:opacity-100";

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
  id: string | null | undefined;
  emptyLabel?: string;
  visibleChars?: number;
  /**
   * `middle` (default) keeps head and tail: `abcd…wxyz`. `prefix` keeps only the
   * first `visibleChars`, the convention for a git commit (`6e2bb10`).
   */
  truncate?: "middle" | "prefix";
  className?: string;
  copyLabel?: string;
  /** Default `toast`; `inline` says "Copied" beside the copy control instead. */
  copyConfirmation?: "toast" | "inline";
  /** Default `hover`: the copy control appears on hover or focus. `always` keeps it visible, for touch and support flows. */
  copyVisibility?: "hover" | "always";
  /** Aligns both tooltips to the trigger, e.g. `end` near a panel's right edge. */
  tooltipAlign?: "start" | "center" | "end";
}

export function TruncatedId({
  id,
  emptyLabel = "N/A",
  visibleChars = DEFAULT_VISIBLE_CHARS,
  truncate = "middle",
  className,
  copyLabel = "Copy ID",
  copyConfirmation = "toast",
  copyVisibility = "hover",
  tooltipAlign,
}: Readonly<TruncatedIdProps>) {
  const trimmed = id?.trim() ?? "";
  if (trimmed.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyLabel}
      </span>
    );
  }

  const displayValue =
    truncate === "prefix"
      ? trimmed.slice(0, visibleChars)
      : truncateId(trimmed, visibleChars);
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
            <TooltipContent align={tooltipAlign}>
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
        confirmation={copyConfirmation}
        tooltipContentProps={{ align: tooltipAlign }}
        className={cn(
          "items-center gap-1",
          copyVisibility === "hover" && HOVER_REVEAL,
        )}
        buttonClassName="size-5"
      />
    </div>
  );
}
