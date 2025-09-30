"use client";

import { useFormEditorHeader } from "../editor/use-form-editor-header.hook";
import FormEditorHeader from "../editor/form-editor-header";
import FormEditorContainer from "../editor/form-editor-container";
import { ICreatorOptions } from "survey-creator-core";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";

export interface FormDesignerLayoutProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
}

export default function FormDesignerLayout({
  formId,
  formJson,
  formName,
  options,
  slkVal,
  themeId,
}: FormDesignerLayoutProps) {
  const router = useRouter();

  // State for header coordination
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCurrentThemeModified, setIsCurrentThemeModified] = useState(false);
  const formSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);

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
    <>
      <FormEditorHeader
        {...headerState}
        hasUnsavedChanges={hasUnsavedChanges}
        isCurrentThemeModified={isCurrentThemeModified}
      />
      <FormEditorContainer
        formId={formId}
        formJson={formJson}
        formName={formName}
        options={options}
        slkVal={slkVal}
        themeId={themeId}
        onUnsavedChanges={setHasUnsavedChanges}
        onThemeModificationChange={setIsCurrentThemeModified}
        onSaveHandlerReady={setSaveHandler}
      />
    </>
  );
}