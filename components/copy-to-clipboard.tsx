import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import { toast } from "./ui/toast";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CopyToClipboardProps extends React.HTMLAttributes<HTMLDivElement> {
  copyValue?: () => string;
  label?: string;
}

const ANIMATION_DURATION = 2000;

const CopyToClipboard = ({
  copyValue,
  label,
  ...props
}: CopyToClipboardProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success({
      title: "Copied to clipboardcheto",
      duration: ANIMATION_DURATION,
    });
  };

  const handleCopyClick = () => {
    copyToClipboard(copyValue?.() ?? "");
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, ANIMATION_DURATION);
  };

  return (
    <div
      {...props}
      className={cn(
        "absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer z-10",
        props.className,
      )}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={handleCopyClick}
              aria-label={label ?? "Copy to clipboard"}
              className="h-4 w-4 shrink-0 rounded-lg p-0 [&>svg]:size-3"
            >
              {isCopied ? (
                <Check className="animate-in fade-in-0 zoom-in-95 duration-500 transition-all" />
              ) : (
                <Clipboard className="transition-all duration-200 hover:scale-110" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCopied ? "Copied to clipboard" : "Copy to clipboard"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CopyToClipboard;
