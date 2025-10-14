"use client";

import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { FormEditorHeaderState } from "./use-form-editor-header.hook";

interface FormEditorHeaderProps extends FormEditorHeaderState {
  hasUnsavedChanges: boolean;
  isCurrentThemeModified: boolean;
}

export default function FormEditorHeader({
  isEditingName,
  name,
  inputRef,
  isPending,
  isSaving,
  hasUnsavedChanges,
  isCurrentThemeModified,
  handleSaveAndGoBack,
  handleKeyDown,
  saveFormHandler,
  setIsEditingName,
  setName,
}: FormEditorHeaderProps) {
  return (
    <div className="flex justify-between items-center mt-0 pt-4 pb-4 px-6 sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-8">
        <button
          onClick={handleSaveAndGoBack}
          className="mr-0 text-2xl flex items-center"
          disabled={isSaving}
          style={{ border: "none", background: "transparent" }}
        >
          ←
        </button>

        {isEditingName ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-bold text-lg border border-gray-300 rounded"
            autoFocus
          />
        ) : (
          <span
            className="font-bold text-lg hover:border hover:border-gray-300 hover:rounded px-1"
            onClick={() => setIsEditingName(true)}
            style={{ cursor: "text" }}
          >
            {name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {(hasUnsavedChanges || isCurrentThemeModified) && (
          <span className="font-bold text-black text-xs border border-black px-2 py-0.5 rounded-full whitespace-nowrap">
            Unsaved changes
          </span>
        )}
        <Button
          disabled={isPending}
          onClick={saveFormHandler}
          variant="default"
          size="sm"
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}