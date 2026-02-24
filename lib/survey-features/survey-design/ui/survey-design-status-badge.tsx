"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/loaders/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CircleX, Code, Pencil } from "lucide-react";
import { useEffect } from "react";

const SAVED_SUCCESS_DURATION_MS = 2000;
const INVALID_JSON_TOOLTIP = "Fix all errors in the JSON editor before saving.";

export interface SurveyDesignStatusBadgeProps {
  hasJsonErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  showSavedSuccess?: boolean;
  onSavedSuccessDismiss?: () => void;
  invalidJsonTooltip?: string;
}

enum SurveyDesignStatus {
  NoChanges = "NoChanges",
  InvalidJson = "InvalidJson",
  SaveInProgress = "SaveInProgress",
  Saved = "Saved",
  JsonModified = "JsonChanges",
  UnsavedChanges = "UnsavedChanges",
}

function SurveyDesignStatusBadge({
  hasJsonErrors,
  isOnJsonTab,
  isJsonModified,
  hasUnsavedChanges,
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

  const surveyDesignStatus = (): SurveyDesignStatus => {
    if (hasJsonErrors) {
      return SurveyDesignStatus.InvalidJson;
    }
    if (isSaving) {
      return SurveyDesignStatus.SaveInProgress;
    }
    if (showSavedSuccess) {
      return SurveyDesignStatus.Saved;
    }

    if (isJsonModified && isOnJsonTab) {
      return SurveyDesignStatus.JsonModified;
    }

    if (hasUnsavedChanges && !isOnJsonTab) {
      return SurveyDesignStatus.UnsavedChanges;
    }

    return SurveyDesignStatus.NoChanges;
  };

  switch (surveyDesignStatus()) {
    case SurveyDesignStatus.InvalidJson:
      return <InvalidJsonBadge invalidJsonTooltip={invalidJsonTooltip} />;
    case SurveyDesignStatus.SaveInProgress:
      return <SaveInProgressBadge />;
    case SurveyDesignStatus.Saved:
      return <SavedSuccessBadge />;
    case SurveyDesignStatus.JsonModified:
      return <UnsavedJsonChangesBadge />;
    case SurveyDesignStatus.UnsavedChanges:
      return <UnsavedChangesBadge />;
    case SurveyDesignStatus.NoChanges:
      return null;
  }
}

const InvalidJsonBadge = ({
  invalidJsonTooltip,
}: {
  invalidJsonTooltip: string;
}) => (
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

const SaveInProgressBadge = () => (
  <Badge variant="secondary" className="gap-1">
    <Spinner size={12} className="shrink-0" data-icon="inline-start" />
    Saving
  </Badge>
);

const SavedSuccessBadge = () => (
  <Badge
    variant="outline"
    className="gap-1 border-green-600 text-green-600 dark:border-green-500 dark:text-green-500"
  >
    <Check className="size-4" />
    Saved
  </Badge>
);

const UnsavedJsonChangesBadge = () => (
  <TooltipProvider delayDuration={0}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1">
          <Code className="size-4" />
          Json modified
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        Check the form in the Designer or Preview tabs to see the changes.
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const UnsavedChangesBadge = () => (
  <Badge variant="outline" className="gap-1">
    <Pencil className="size-4" />
    Unsaved changes
  </Badge>
);

export { SurveyDesignStatusBadge };
