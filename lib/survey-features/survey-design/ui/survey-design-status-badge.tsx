"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/loaders/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CircleX } from "lucide-react";
import { useEffect } from "react";

const SAVED_SUCCESS_DURATION_MS = 2000;
const INVALID_JSON_TOOLTIP = "Fix all errors in the JSON editor before saving.";

export interface SurveyDesignStatusBadgeProps {
  showInvalidJson: boolean;
  showUnsavedChanges: boolean;
  isSaving?: boolean;
  showSavedSuccess?: boolean;
  onSavedSuccessDismiss?: () => void;
  invalidJsonTooltip?: string;
}

export function SurveyDesignStatusBadge({
  showInvalidJson,
  showUnsavedChanges,
  isSaving = false,
  showSavedSuccess = false,
  onSavedSuccessDismiss,
  invalidJsonTooltip = INVALID_JSON_TOOLTIP,
}: SurveyDesignStatusBadgeProps) {
  useEffect(() => {
    if (!showSavedSuccess || onSavedSuccessDismiss == null) {
      return;
    }
    
    const id = globalThis.window.setTimeout(
      onSavedSuccessDismiss,
      SAVED_SUCCESS_DURATION_MS,
    );
    return () => globalThis.window.clearTimeout(id);
  }, [showSavedSuccess, onSavedSuccessDismiss]);

  if (showInvalidJson) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="gap-1 cursor-help border-destructive text-destructive"
            >
              <CircleX className="size-4 text-destructive" />
              Invalid JSON
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {invalidJsonTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isSaving) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Spinner size={12} className="shrink-0" data-icon="inline-start" />
        Saving
      </Badge>
    );
  }

  if (showSavedSuccess) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-600 text-green-600 dark:border-green-500 dark:text-green-500"
      >
        <Check className="size-4" />
        Saved
      </Badge>
    );
  }

  if (showUnsavedChanges) {
    return (
      <Badge variant="outline" className="gap-1">
        Unsaved changes
      </Badge>
    );
  }

  return null;
}
