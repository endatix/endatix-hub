"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import {
  SurveyDesignSaveButton,
  SurveyDesignStatusBadge,
} from "@/lib/survey-features/survey-design/ui";
import { FormEditorHeaderState } from "./use-form-editor-header.hook";
import FormPublicStatus from "./form-public-status";

interface FormEditorHeaderProps extends FormEditorHeaderState {
  isCurrentThemeModified: boolean;
  isPublic?: boolean;
}

export default function FormEditorHeader({
  isEditingName,
  name,
  inputRef,
  isPending,
  isSaving,
  hasUnsavedChanges,
  hasJsonErrors,
  isOnJsonTab,
  showSavedSuccess,
  isCurrentThemeModified,
  isPublic,
  handleSaveAndGoBack,
  handleKeyDown,
  saveFormHandler,
  clearSavedSuccess,
  setIsEditingName,
  setName,
}: FormEditorHeaderProps) {
  const saveDisabled = isPending || isOnJsonTab;
  const showInvalidJson = isOnJsonTab && hasJsonErrors;
  const showUnsavedChanges =
    !showInvalidJson && (hasUnsavedChanges || isCurrentThemeModified);
  return (
    <div className="flex justify-between items-center mt-0 pt-4 pb-4 px-6 sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-6">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Save and Go Back"
          onClick={handleSaveAndGoBack}
          disabled={isSaving}
        >
          <ArrowLeftIcon />
        </Button>

        {isEditingName ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-bold text-lg border border-border rounded"
            autoFocus
          />
        ) : (
          <span
            className="font-bold text-lg hover:border hover:border-border hover:rounded px-1"
            onClick={() => setIsEditingName(true)}
            style={{ cursor: "text" }}
          >
            {name}
          </span>
        )}
        <FormPublicStatus isPublic={isPublic} />
      </div>
      <div className="flex items-center gap-2">
        <SurveyDesignStatusBadge
          showInvalidJson={showInvalidJson}
          showUnsavedChanges={showUnsavedChanges}
          isSaving={isPending}
          showSavedSuccess={showSavedSuccess}
          onSavedSuccessDismiss={clearSavedSuccess}
        />
        <SurveyDesignSaveButton
          disabled={saveDisabled}
          onClick={saveFormHandler}
          label="Save"
          isPending={isPending}
          savingLabel="Saving..."
        />
      </div>
    </div>
  );
}
