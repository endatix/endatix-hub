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

function FormPublicStatus({ isPublic, includeTooltip }: FormPublicStatusProps) {
  if (isPublic === undefined) {
    return null;
  }

  const statusLabel = isPublic ? <PublicStatusLabel /> : <PrivateStatusLabel />;

  if (!includeTooltip) {
    return statusLabel;
  }

  const tooltipContent = isPublic
    ? "This form is shared with everyone"
    : "This form requires authentication";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{statusLabel}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const PublicStatusLabel = () => (
  <span className={cn(BASE_CSS_CLASS, "border-primary text-primary")}>
    <Globe className="h-3 w-3" />
    Public
  </span>
);

const PrivateStatusLabel = () => (
  <span
    className={cn(
      BASE_CSS_CLASS,
      "border-muted-foreground text-muted-foreground",
    )}
  >
    <Lock className="h-3 w-3" />
    Private
  </span>
);

export default FormPublicStatus;
