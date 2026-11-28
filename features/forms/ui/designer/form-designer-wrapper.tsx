"use client";

import { useFormEditorHeader } from "../editor/use-form-editor-header.hook";
import FormEditorHeader from "../editor/form-editor-header";
import FormEditorContainer from "../editor/form-editor-container";
import FormEditorWithChat from "../editor/form-editor-with-chat";
import { DesignSurveyProvider } from "@/lib/survey-features/designer/design-survey.context";
import { ICreatorOptions } from "survey-creator-core";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { useFormAssistant } from "@/features/forms/use-cases/design-form/form-assistant.context";
import type { FormDesignReturn } from "../../form-workspace";
import type { DesignerAudience } from "../editor/form-editor";
import { DraftEditorProvider, LegacyScope } from "../../edit-draft/draft-editor-context";
import type { EditorSource } from "../../edit-draft/editor-source.server";
import { LegacyEditorSource } from "./legacy-editor-source";

export interface FormDesignerWrapperProps {
  formId: string;
  source: EditorSource;
  formName: string;
  options?: ICreatorOptions;
  themeId?: string;
  isPublic?: boolean;
  formIsEnabled?: boolean;
  /** The workspace page the designer was opened from; Back returns there. */
  designReturn?: FormDesignReturn;
  audience?: DesignerAudience | null;
}

interface FormDesignerContentProps extends Omit<
  FormDesignerWrapperProps,
  "source"
> {
  formJson: object | null;
  isCurrentThemeModified: boolean;
  setIsCurrentThemeModified: (value: boolean) => void;
  formSaveHandlerRef: React.RefObject<(() => Promise<void>) | null>;
}

function FormDesignerContent({
  formId,
  formJson,
  formName,
  options,
  themeId,
  isPublic,
  formIsEnabled,
  designReturn,
  audience,
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

  const backHref = designReturn?.href ?? (`/forms/${formId}` as Route);
  const handleNavigateBack = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  const headerState = useFormEditorHeader({
    formId,
    initialFormName: formName,
    isCurrentThemeModified,
    onSave: handleSave,
    onNavigateBack: handleNavigateBack,
  });

  return (
    <div className="flex h-full flex-col">
      <FormEditorHeader
        {...headerState}
        isCurrentThemeModified={isCurrentThemeModified}
        isPublic={isPublic}
        backLabel={`Back to ${designReturn?.label ?? "Overview"}`}
      />
      {isAssistantEnabled ? (
        <FormEditorWithChat
          formId={formId}
          formJson={formJson}
          formName={formName}
          options={options}
          themeId={themeId}
          isPublic={isPublic}
          formIsEnabled={formIsEnabled}
          audience={audience}
          onThemeModificationChange={setIsCurrentThemeModified}
          onSaveHandlerReady={setSaveHandler}
        />
      ) : (
        <FormEditorContainer
          formId={formId}
          formJson={formJson}
          formName={formName}
          options={options}
          themeId={themeId}
          isPublic={isPublic}
          formIsEnabled={formIsEnabled}
          audience={audience}
          onThemeModificationChange={setIsCurrentThemeModified}
          onSaveHandlerReady={setSaveHandler}
        />
      )}
    </div>
  );
}

function useEditorContent(props: Omit<FormDesignerWrapperProps, "source">) {
  const [themeModified, setThemeModified] = useState(false);
  const formSaveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const editor = (formJson: object | null) => <FormDesignerContent {...props} formJson={formJson}
    isCurrentThemeModified={themeModified} setIsCurrentThemeModified={setThemeModified} formSaveHandlerRef={formSaveHandlerRef} />;
  return { editor, themeModified };
}

function ScopedFormDesigner({source: refreshed, ...props}: FormDesignerWrapperProps) {
  const [source] = useState(refreshed);
  const { editor, themeModified } = useEditorContent(props);
  return (
    <DesignSurveyProvider>
      {source.kind !== refreshed.kind && (
        <p role="alert">The editor mode changed. Save or download your local changes before reopening the designer.</p>
      )}
      {source.kind === "active" ? (
        <LegacyScope.Provider value={source.scope}>
          <LegacyEditorSource themeModified={themeModified} frozen={refreshed.kind !== "active"} source={refreshed.kind === "active" ? refreshed.formJson : source.formJson}>{editor}</LegacyEditorSource>
        </LegacyScope.Provider>
      ) : (
        <DraftEditorProvider key={source.scope} formId={props.formId} {...source}>
          {editor}
        </DraftEditorProvider>
      )}
    </DesignSurveyProvider>
  );
}

export default function FormDesignerWrapper(props: FormDesignerWrapperProps) {
  return <ScopedFormDesigner key={props.source.scope} {...props} />;
}
