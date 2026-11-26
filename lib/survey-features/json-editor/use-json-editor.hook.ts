"use client";

import { useCallback, useEffect, useRef } from "react";
import { Base, Model, type IPropertyValueChangedEvent } from "survey-core";
import {
  TabJsonEditorAcePlugin,
  type ActiveTabChangedEvent,
  type JsonEditorBaseModel,
  type LintSurveyEvent,
  type SurveyCreatorModel,
  type TabJsonEditorBasePlugin,
} from "survey-creator-core";
import { LINT_RULE } from "@/lib/survey-features/survey-lint";
import {
  type JsonEditorState,
  AceJsonPlugin,
  JSON_EDITOR_PLUGIN_NAME,
  JSON_EDITOR_PROPERTY_NAMES,
  NOT_ON_JSON_TAB_STATE,
  createOnJsonTabState,
} from "./json-editor-state";
import { addObfuscatedJsonDownload } from "./json-download-menu";
import { Result } from "@/lib/result";

const INVALID_JSON_ERROR_MESSAGE =
  "Please fix the errors in the JSON schema and try again.";
const MALFORMED_JSON_ERROR_MESSAGE =
  "JSON schema is malformed and cannot be parsed.";
const UNEXPECTED_ERROR_MESSAGE =
  "Unexpeted error. Please reload the page and try again.";

/** One assignment. Does not replace `rules`, call lintRules(), or touch variablePresets. */
function warnUnknownReference(
  _sender: SurveyCreatorModel,
  options: LintSurveyEvent,
): void {
  options.lintOptions.rules![LINT_RULE.unknown] = "warning";
}

/** undefined and false block; true (warnings at most) does not. */
function jsonTabBlocks(model: JsonEditorBaseModel): boolean {
  return model.allowingDeactivate() !== true;
}

export type { JsonEditorState } from "./json-editor-state";

export interface UseJsonEditorOptions {
  onJsonStateChange?: (state: JsonEditorState) => void;
  /** The form's name, for the obfuscated download's file name. */
  downloadName?: string;
}

interface JsonBuffer {
  model: JsonEditorBaseModel;
  savedText: string;
  modified: boolean;
}

function useJsonSaveBuffer() {
  const activeBuffer = useRef<JsonBuffer | null>(null);
  const captureJsonSave = useCallback(() => {
    const buffer = activeBuffer.current;
    const submitted = buffer?.model.text;
    return () => {
      if (activeBuffer.current !== buffer) return false;
      if (!buffer || submitted === undefined) return true;
      buffer.savedText = submitted;
      buffer.modified = buffer.model.text !== submitted;
      return !buffer.modified;
    };
  }, []);
  return { activeBuffer, captureJsonSave };
}

/**
 * Registers JSON editor state and change handling with the Survey Creator.
 * Subscribes to the plugin model's onPropertyChanged for hasErrors and aceCanUndo.
 * Does not subscribe to creator.onModified; the consumer should do that for unsaved state.
 *
 * @param options.onJsonStateChange - Called when JSON tab, validation, or modified state changes.
 * @param options.downloadName - Names the obfuscated download, `<downloadName>.obf.json`.
 * @returns { registerJsonEditor } - Call with creator; returns cleanup.
 */
export function useJsonEditor(options: UseJsonEditorOptions) {
  const { onJsonStateChange, downloadName = "" } = options;
  const { activeBuffer, captureJsonSave } = useJsonSaveBuffer();
  const downloadNameRef = useRef(downloadName);
  useEffect(() => {
    downloadNameRef.current = downloadName;
  }, [downloadName]);

  const registerJsonEditor = useCallback(
    (creator: SurveyCreatorModel): (() => void) => {
      let removeModelListener: (() => void) | undefined;

      function notify(overrides: Partial<JsonEditorState>) {
        const isJsonModified = activeBuffer.current?.modified ?? false;
        onJsonStateChange?.(
          createOnJsonTabState({ isJsonModified, ...overrides }),
        );
      }

      function leaveJsonTab() {
        removeModelListener?.();
        removeModelListener = undefined;
        activeBuffer.current = null;
        notify(NOT_ON_JSON_TAB_STATE);
      }

      function enterJsonTab() {
        const jsonPlugin: TabJsonEditorBasePlugin = creator.getPlugin(
          JSON_EDITOR_PLUGIN_NAME,
        );
        const model = jsonPlugin?.model as unknown as AceJsonPlugin;
        const hasAceEditor = TabJsonEditorAcePlugin.hasAceEditor();
        if (!model || !hasAceEditor) return;

        // Reading creator.text after an edit applies the pending buffer to Designer.
        // Compare with the saved text captured before Ace starts editing instead.
        const buffer = { model, savedText: creator.text, modified: false };
        activeBuffer.current = buffer;
        let unsubscribe: (() => void) | undefined;
        const onEdit = () => {
          if (buffer.modified || model.text === buffer.savedText) return;
          buffer.modified = true;
          notify({ hasErrors: jsonTabBlocks(model) });
        };

        const onPropertyChanged = (
          _sender: Base,
          options: IPropertyValueChangedEvent,
        ) => {
          const { name } = options;

          if (name === JSON_EDITOR_PROPERTY_NAMES.hasErrors) {
            notify({ hasErrors: jsonTabBlocks(model) });
          }

          if (!unsubscribe && model.aceEditor) {
            const session = model.aceEditor.getSession();
            session.on("change", onEdit);
            unsubscribe = () => session.off("change", onEdit);
          }
        };

        model.onPropertyChanged.add(onPropertyChanged);
        const onErrorListChanged = (
          _sender: Base,
          options: IPropertyValueChangedEvent,
        ) => {
          if (options.name !== "actions") return;
          notify({ hasErrors: jsonTabBlocks(model) });
        };
        model.errorList.onPropertyChanged.add(onErrorListChanged);

        removeModelListener = () => {
          model?.onPropertyChanged.remove(onPropertyChanged);
          model.errorList.onPropertyChanged.remove(onErrorListChanged);
          unsubscribe?.();
        };

        notify({ hasErrors: jsonTabBlocks(model) });
      }

      function onTabChanged(
        _sender: SurveyCreatorModel,
        tabOptions: ActiveTabChangedEvent,
      ) {
        if (tabOptions.tabName !== JSON_EDITOR_PLUGIN_NAME) {
          leaveJsonTab();
          return;
        }
        enterJsonTab();
      }

      const removeDownloadMenu = addObfuscatedJsonDownload(
        creator,
        () => downloadNameRef.current,
      );
      creator.onLintSurvey.add(warnUnknownReference);
      creator.onActiveTabChanged.add(onTabChanged);

      return () => {
        removeDownloadMenu();
        creator.onLintSurvey.remove(warnUnknownReference);
        creator.onActiveTabChanged.remove(onTabChanged);
        removeModelListener?.();
        activeBuffer.current = null;
      };
    },
    [activeBuffer, onJsonStateChange],
  );

  const getJsonModel = useCallback(
    (creator: SurveyCreatorModel | null): Result<any> => {
      if (!creator) {
        return Result.error(UNEXPECTED_ERROR_MESSAGE);
      }

      const currentTab = creator.activeTab;

      if (currentTab !== JSON_EDITOR_PLUGIN_NAME) {
        return Result.success(creator.JSON);
      }

      const jsonPlugin: TabJsonEditorBasePlugin = creator.getPlugin(
        JSON_EDITOR_PLUGIN_NAME,
      );

      if (!jsonPlugin) {
        return Result.error(UNEXPECTED_ERROR_MESSAGE);
      }

      if (jsonTabBlocks(jsonPlugin.model)) {
        return Result.validationError(INVALID_JSON_ERROR_MESSAGE);
      }

      try {
        const resultJson = JSON.parse(jsonPlugin.model.text);
        const surveyModel = new Model();
        surveyModel.fromJSON(resultJson);

        if (surveyModel.jsonErrors?.length > 0) {
          return Result.validationError(INVALID_JSON_ERROR_MESSAGE);
        }

        return Result.success(surveyModel.toJSON());
      } catch {
        return Result.validationError(MALFORMED_JSON_ERROR_MESSAGE);
      }
    },
    [],
  );

  return { registerJsonEditor, getJsonModel, captureJsonSave };
}
