import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe, Lock } from "lucide-react";

interface FormPublicStatusProps {
  isPublic?: boolean;
  includeTooltip?: boolean;
}

function FormPublicStatus({
  isPublic,
  includeTooltip = true,
}: FormPublicStatusProps) {
  if (isPublic === undefined) {
    return null;
  }

  const statusLabel = (isPublic: boolean) => {
    const statusCssClass = isPublic
      ? "gap-1 border-primary text-primary"
      : "gap-1 border-muted-foreground text-muted-foreground";
    return (
      <Badge variant="outline" className={statusCssClass}>
        {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
        {isPublic ? "Public" : "Private"}
      </Badge>
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
