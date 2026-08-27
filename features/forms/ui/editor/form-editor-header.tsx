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
  isJsonModified,
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
  const saveDisabled = isPending || isSaving || hasJsonErrors;
  const showInvalidJson = isOnJsonTab && hasJsonErrors;
  const showUnsavedChanges =
    !hasJsonErrors && (hasUnsavedChanges || isCurrentThemeModified);
  return (
    <div className="sticky top-0 z-50 mt-0 flex w-full items-center justify-between border-border/40 bg-background/95 px-6 pt-4 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            className="rounded border border-border text-lg font-bold"
            autoFocus
          />
        ) : (
          <span
            className="px-1 text-lg font-bold hover:rounded hover:border hover:border-border"
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
          isOnJsonTab={isOnJsonTab}
          isJsonModified={isJsonModified}
          hasJsonErrors={showInvalidJson}
          hasUnsavedChanges={showUnsavedChanges}
          isSaving={isSaving}
          showSavedSuccess={showSavedSuccess}
          onSavedSuccessDismiss={clearSavedSuccess}
        />
        <SurveyDesignSaveButton
          disabled={saveDisabled}
          onClick={saveFormHandler}
          label="Save"
          isPending={isSaving}
          savingLabel="Saving..."
        />
      </div>
    </div>
  );
}
