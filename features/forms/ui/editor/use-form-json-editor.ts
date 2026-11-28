import { useCallback, useEffect, useEffectEvent } from "react";
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
import type { DraftAutosave } from "@/lib/survey-features/draft-autosave/controller";

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
  const json = useJsonEditor({
    onJsonStateChange: useJsonTabState(),
    downloadName: formName,
    onJsonEdit(model) {
      if (!controller) return;
      const parsed = json.getJsonModel(model);
      if (Result.isSuccess(parsed))
        controller.edit(JSON.stringify(parsed.value));
    },
  });
  useJournalCapture(creator, controller);
  useAcknowledgeDraft(creator, json, draft);
  return { ...json, controller };
}

function useJournalCapture(creator: SurveyCreatorModel | null, controller: DraftAutosave | undefined) {
  useEffect(() => {
    if (!creator || !controller) return;
    return captureJournal(creator, (records, document) => {
      // Records are detached JSON objects after capture; vendor types don't declare an index signature.
      controller.edit(document, records as unknown as LocalEdit["records"]);
    });
  }, [creator, controller]);
}

export function matchesSavedJson(model: SurveyCreatorModel | null, json: Pick<ReturnType<typeof useJsonEditor>, "getJsonModel">, saved: string) {
  const result = json.getJsonModel(model);
  return Result.isSuccess(result) && JSON.stringify(result.value) === saved;
}

function useAcknowledgeDraft(
  creator: SurveyCreatorModel | null,
  json: ReturnType<typeof useJsonEditor>,
  draft: ReturnType<typeof useEditorDraft>,
) {
  const designer = useSurveyDesigner();
  const acknowledge = useEffectEvent(() => {
    if (draft?.view.status !== "saved" || !creator) return;
    if (!matchesSavedJson(creator, json, draft.view.head.jsonData)) return;
    if (!json.captureJsonSave()()) return;
    designer.setIsJsonModified(false);
    designer.setHasUnsavedChanges(false);
  });
  useEffect(() => { acknowledge(); }, [draft?.view, creator]);
}
