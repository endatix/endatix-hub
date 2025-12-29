"use client";

import { useFormEditorHeader } from "../editor/use-form-editor-header.hook";
import FormEditorHeader from "../editor/form-editor-header";
import FormEditorContainer from "../editor/form-editor-container";
import FormEditorWithChat from "../editor/form-editor-with-chat";
import { ICreatorOptions } from "survey-creator-core";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { useFormAssistant } from "@/features/forms/use-cases/design-form/form-assistant.context";

export interface FormDesignerWrapperProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
}

export default function FormDesignerWrapper({
  formId,
  formJson,
  formName,
  options,
  slkVal,
  themeId,
}: FormDesignerWrapperProps) {
  const router = useRouter();

  // State for header coordination
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCurrentThemeModified, setIsCurrentThemeModified] = useState(false);
  const formSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const { isAssistantEnabled } = useFormAssistant();

  // Wrapper for FormEditor's save handler
  const handleSave = useCallback(async () => {
    if (formSaveHandlerRef.current) {
      await formSaveHandlerRef.current();
    }
  }, []);

  // Callback to store the save handler
  const setSaveHandler = useCallback((handler: () => Promise<void>) => {
    formSaveHandlerRef.current = handler;
  }, []);

  // Header state management
  const headerState = useFormEditorHeader({
    formId,
    initialFormName: formName,
    hasUnsavedChanges,
    isCurrentThemeModified,
    onSave: handleSave,
    onNavigateBack: () => router.push("/forms"),
  });

  return (
    <div className="flex flex-col h-full">
      <FormEditorHeader
        {...headerState}
        hasUnsavedChanges={hasUnsavedChanges}
        isCurrentThemeModified={isCurrentThemeModified}
      />
      {isAssistantEnabled ? (
        <FormEditorWithChat
          formId={formId}
          formJson={formJson}
          formName={formName}
          options={options}
          slkVal={slkVal}
          themeId={themeId}
          hasUnsavedChanges={hasUnsavedChanges}
          onUnsavedChanges={setHasUnsavedChanges}
          onThemeModificationChange={setIsCurrentThemeModified}
          onSaveHandlerReady={setSaveHandler}
        />
      ) : (
        <FormEditorContainer
          formId={formId}
          formJson={formJson}
          formName={formName}
          options={options}
          slkVal={slkVal}
          themeId={themeId}
          hasUnsavedChanges={hasUnsavedChanges}
          onUnsavedChanges={setHasUnsavedChanges}
          onThemeModificationChange={setIsCurrentThemeModified}
          onSaveHandlerReady={setSaveHandler}
        />
      )}
    </div>
  );
}
