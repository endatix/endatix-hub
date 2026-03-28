import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "./ui/toast";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export type CopyToClipboardTooltipContext = {
  isCopied: boolean;
};

interface CopyToClipboardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  copyValue: string | (() => string);
  label?: string;
  /** Default `overlay`: absolute top-right inside a `relative` parent. `inline`: in-flow next to siblings. */
  layout?: "overlay" | "inline";
  disabled?: boolean;
  /** Full tooltip body. Function receives copy state for dynamic content. */
  tooltipContent?:
    | ReactNode
    | ((ctx: CopyToClipboardTooltipContext) => ReactNode);
  tooltipContentProps?: React.ComponentProps<typeof TooltipContent>;
  /** Merged onto the icon button (size, padding, etc.). */
  buttonClassName?: string;
}

export const copyValueToClipboard = (value: string): boolean => {
  let isCopied = false;
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return isCopied;
  }

  if (globalThis?.navigator?.clipboard) {
    globalThis?.navigator?.clipboard?.writeText(value);
    isCopied = true;
  }

  if (isCopied) {
    toast.success({
      title: "Copied to clipboard",
      duration: ANIMATION_DURATION,
    });
  }

  return isCopied;
};

const ANIMATION_DURATION = 4000;

const CopyToClipboard = ({
  copyValue,
  label,
  layout = "overlay",
  disabled = false,
  tooltipContent,
  tooltipContentProps,
  buttonClassName,
  className,
  ...props
}: CopyToClipboardProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    if (disabled) {
      return;
    }
    const copied = copyValueToClipboard(
      typeof copyValue === "function" ? copyValue() : copyValue,
    );

    if (copied) {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, ANIMATION_DURATION);
    }
  };

  const defaultTooltip = isCopied ? "Copied to clipboard" : "Copy to clipboard";
  const tooltipBody =
    tooltipContent === undefined
      ? defaultTooltip
      : typeof tooltipContent === "function"
        ? tooltipContent({ isCopied })
        : tooltipContent;

  const cursorClassName = disabled ? "cursor-default" : "cursor-pointer";
  const layoutClassName =
    layout === "overlay"
      ? cn(
          cursorClassName,
          "absolute top-1/2 right-2.5 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground",
        )
      : cn(
          cursorClassName,
          "relative inline-flex shrink-0 text-muted-foreground",
        );

  const button = (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={handleCopyClick}
      aria-label={label ?? "Copy to clipboard"}
      className={cn(
        "shrink-0 rounded-lg p-0 [&>svg]:size-3",
        layout === "inline" ? "size-8" : "h-4 w-4",
        buttonClassName,
      )}
    >
      {isCopied ? (
        <Check className="animate-in transition-all duration-500 fade-in-0 zoom-in-95" />
      ) : (
        <Copy className="opacity-50 transition-all duration-200 hover:scale-110 hover:opacity-100" />
      )}
    </Button>
  );

  if (disabled) {
    return (
      <div {...props} className={cn(layoutClassName, className)}>
        {button}
      </div>
    );
  }

  return (
    <div {...props} className={cn(layoutClassName, className)}>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent {...tooltipContentProps}>
            {tooltipBody}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CopyToClipboard;
