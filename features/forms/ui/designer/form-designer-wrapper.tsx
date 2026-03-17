"use client";

import { useFormEditorHeader } from "../editor/use-form-editor-header.hook";
import FormEditorHeader from "../editor/form-editor-header";
import FormEditorContainer from "../editor/form-editor-container";
import FormEditorWithChat from "../editor/form-editor-with-chat";
import { DesignSurveyProvider } from "@/lib/survey-features/designer/design-survey.context";
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
  isPublic?: boolean;
}

interface FormDesignerContentProps extends FormDesignerWrapperProps {
  isCurrentThemeModified: boolean;
  setIsCurrentThemeModified: (value: boolean) => void;
  formSaveHandlerRef: React.RefObject<(() => Promise<void>) | null>;
}

function FormDesignerContent({
  formId,
  formJson,
  formName,
  options,
  slkVal,
  themeId,
  isPublic,
  isCurrentThemeModified,
  setIsCurrentThemeModified,
  formSaveHandlerRef,
}: Readonly<FormDesignerContentProps>) {
  const router = useRouter();
  const { isAssistantEnabled } = useFormAssistant();

  const handleSave = useCallback(async () => {
    if (formSaveHandlerRef.current) {
      await formSaveHandlerRef.current();
    }
  }, [formSaveHandlerRef]);

  const setSaveHandler = useCallback(
    (handler: () => Promise<void>) => {
      formSaveHandlerRef.current = handler;
    },
    [formSaveHandlerRef],
  );

  const headerState = useFormEditorHeader({
    formId,
    initialFormName: formName,
    isCurrentThemeModified,
    onSave: handleSave,
    onNavigateBack: () => router.push("/forms"),
  });

  return (
    <div className="flex h-full flex-col">
      <FormEditorHeader
        {...headerState}
        isCurrentThemeModified={isCurrentThemeModified}
        isPublic={isPublic}
      />
      {isAssistantEnabled ? (
        <FormEditorWithChat
          formId={formId}
          formJson={formJson}
          formName={formName}
          options={options}
          slkVal={slkVal}
          themeId={themeId}
          isPublic={isPublic}
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
          isPublic={isPublic}
          onThemeModificationChange={setIsCurrentThemeModified}
          onSaveHandlerReady={setSaveHandler}
        />
      )}
    </div>
  );
}

export default function FormDesignerWrapper({
  formId,
  formJson,
  formName,
  options,
  slkVal,
  themeId,
  isPublic,
}: FormDesignerWrapperProps) {
  const [isCurrentThemeModified, setIsCurrentThemeModified] = useState(false);
  const formSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  return (
    <DesignSurveyProvider>
      <FormDesignerContent
        formId={formId}
        formJson={formJson}
        formName={formName}
        options={options}
        slkVal={slkVal}
        themeId={themeId}
        isPublic={isPublic}
        isCurrentThemeModified={isCurrentThemeModified}
        setIsCurrentThemeModified={setIsCurrentThemeModified}
        formSaveHandlerRef={formSaveHandlerRef}
      />
    </DesignSurveyProvider>
  );
}
