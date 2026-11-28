import { useCallback, useEffect } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import { captureJournal } from "@endatix/survey-journal";
import { useEditorDraft } from "../../edit-draft/draft-editor-context";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";
import type { LocalEdit } from "@/lib/survey-features/draft-autosave/journal-batch";
import {
  useJsonEditor,
  type JsonEditorState,
} from "@/lib/survey-features/json-editor/use-json-editor.hook";
import { Result } from "@/lib/result";

function useJsonTabState() {
  const {
    setHasJsonErrors,
    setIsOnJsonTab,
    setIsJsonModified,
    setHasUnsavedChanges,
  } = useSurveyDesigner();
  return useCallback(
    (state: JsonEditorState) => {
      setHasJsonErrors(state.hasErrors);
      setIsOnJsonTab(state.isOnJsonTab);
      setIsJsonModified(state.isJsonModified);
      if (state.isJsonModified) setHasUnsavedChanges(true);
    },
    [setHasJsonErrors, setIsOnJsonTab, setIsJsonModified, setHasUnsavedChanges],
  );
}

export function useFormJsonEditor(
  creator: SurveyCreatorModel | null,
  formName: string,
) {
  const draft = useEditorDraft();
  const controller = draft?.controller;
  const onJsonStateChange = useJsonTabState();
  const json = useJsonEditor({
    onJsonStateChange,
    downloadName: formName,
    onJsonEdit(model) {
      if (!controller) return;
      const parsed = json.getJsonModel(model);
      if (Result.isSuccess(parsed))
        controller.edit(JSON.stringify(parsed.value));
    },
  });
  useEffect(() => {
    if (!creator || !controller) return;
    return captureJournal(creator, (records, document) => {
      // Records are detached JSON objects after capture; vendor types don't declare an index signature.
      controller.edit(document, records as unknown as LocalEdit["records"]);
    });
  }, [creator, controller]);
  useAcknowledgeDraft(creator, json, draft);
  return { ...json, controller };
}

function useAcknowledgeDraft(
  creator: SurveyCreatorModel | null,
  json: ReturnType<typeof useJsonEditor>,
  draft: ReturnType<typeof useEditorDraft>,
) {
  const { isJsonModified, setIsJsonModified, setHasUnsavedChanges } =
    useSurveyDesigner();
  const { captureJsonSave, getJsonModel } = json;
  useEffect(() => {
    if (draft?.view.status !== "saved" || !creator) return;
    if (isJsonModified) {
      const parsed = getJsonModel(creator);
      if (
        !Result.isSuccess(parsed) ||
        JSON.stringify(parsed.value) !== draft.controller.localDocument
      )
        return;
    }
    if (captureJsonSave()()) {
      setHasUnsavedChanges(false);
      setIsJsonModified(false);
    }
  }, [
    draft,
    creator,
    isJsonModified,
    getJsonModel,
    captureJsonSave,
    setHasUnsavedChanges,
    setIsJsonModified,
  ]);
}
