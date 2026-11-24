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
  /** Default `toast`. `inline` says "Copied" beside the control instead, for panels whose own actions a toast would cover. */
  confirmation?: "toast" | "inline";
}

async function writeToClipboard(value: string): Promise<boolean> {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const clipboard = globalThis?.navigator?.clipboard;
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** Await clipboard write; return whether it succeeded (no toast on failure). */
export const copyValueToClipboard = async (value: string): Promise<boolean> => {
  if (!(await writeToClipboard(value))) {
    return false;
  }

  toast.success({
    title: "Copied to clipboard",
    duration: ANIMATION_DURATION,
  });

  return true;
};

const ANIMATION_DURATION = 4000;
const INLINE_CONFIRMATION_DURATION = 2000;
const TOOLTIP_TEXT_DEFAULT = "Copy to clipboard";
const TOOLTIP_TEXT_COPIED = "Copied to clipboard";

const getTooltipContent = (
  tooltipContent:
    | ReactNode
    | ((ctx: CopyToClipboardTooltipContext) => ReactNode),
  isCopied: boolean,
) => {
  if (tooltipContent === undefined) {
    return isCopied ? TOOLTIP_TEXT_COPIED : TOOLTIP_TEXT_DEFAULT;
  }

  if (typeof tooltipContent === "function") {
    return tooltipContent({ isCopied });
  }

  return tooltipContent;
};

const CopyToClipboard = ({
  copyValue,
  label,
  layout = "overlay",
  disabled = false,
  tooltipContent,
  tooltipContentProps,
  buttonClassName,
  confirmation = "toast",
  className,
  ...props
}: CopyToClipboardProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async () => {
    if (disabled) {
      return;
    }
    const value = typeof copyValue === "function" ? copyValue() : copyValue;
    const inline = confirmation === "inline";
    const copied = inline
      ? await writeToClipboard(value)
      : await copyValueToClipboard(value);

    if (copied) {
      setIsCopied(true);

      setTimeout(
        () => {
          setIsCopied(false);
        },
        inline ? INLINE_CONFIRMATION_DURATION : ANIMATION_DURATION,
      );
    }
  };
  const inlineConfirmation =
    confirmation === "inline" && isCopied ? (
      <span role="status" className="text-xs text-muted-foreground">
        Copied
      </span>
    ) : null;

  const tooltipBody = getTooltipContent(tooltipContent, isCopied);
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
        {inlineConfirmation}
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
      {inlineConfirmation}
    </div>
  );
};

export default CopyToClipboard;
