import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Globe, Lock } from "lucide-react";

interface FormPublicStatusProps {
  isPublic?: boolean;
  includeTooltip?: boolean;
}

const BASE_CSS_CLASS =
  "text-xs border rounded-full px-2 py-0.5 flex items-center gap-1 whitespace-nowrap";

function FormPublicStatus({
  isPublic,
  includeTooltip = true,
}: FormPublicStatusProps) {
  if (isPublic === undefined) {
    return null;
  }

  const statusLabel = (isPublic: boolean) => {
    const statusCssClass = isPublic
      ? "border-primary text-primary"
      : "border-muted-foreground text-muted-foreground";
    return (
      <span className={cn(BASE_CSS_CLASS, statusCssClass)}>
        {isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
        {isPublic ? "Public" : "Private"}
      </span>
    );
  };

  if (!includeTooltip) {
    return statusLabel(isPublic);
  }

  const tooltipContent = isPublic
    ? "This form is shared with everyone"
    : "This form requires authentication";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{statusLabel(isPublic)}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FormPublicStatus;
