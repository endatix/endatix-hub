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
import { conversionSession, prepareDefinitionSave } from "../form-diagnostics/conversion-session";

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

function validateBuffer(text: string): Result<object> {
  try {
    const survey = new Model();
    survey.fromJSON(JSON.parse(text));
    if (survey.jsonErrors?.length > 0) return Result.validationError(INVALID_JSON_ERROR_MESSAGE);
    return Result.success(survey.toJSON());
  } catch {
    return Result.validationError(MALFORMED_JSON_ERROR_MESSAGE);
  }
}

function getJsonModel(creator: SurveyCreatorModel | null): Result<object> {
  if (!creator) return Result.error(UNEXPECTED_ERROR_MESSAGE);
  if (creator.activeTab !== JSON_EDITOR_PLUGIN_NAME) return Result.success(creator.JSON);
  const plugin: TabJsonEditorBasePlugin = creator.getPlugin(JSON_EDITOR_PLUGIN_NAME);
  if (!plugin) return Result.error(UNEXPECTED_ERROR_MESSAGE);
  if (jsonTabBlocks(plugin.model)) return Result.validationError(INVALID_JSON_ERROR_MESSAGE);
  return validateBuffer(plugin.model.text);
}

export type { JsonEditorState } from "./json-editor-state";

export interface UseJsonEditorOptions {
  onJsonStateChange?: (state: JsonEditorState) => void;
  /** The form's name, for the obfuscated download's file name. */
  downloadName?: string;
}

interface JsonBuffer {
  model: AceJsonPlugin;
  savedText: string;
  modified: boolean;
}

function editorText(buffer: JsonBuffer) {
  return { savedText: buffer.savedText, text: buffer.model.text };
}

// Activation and file import both call Ace.setValue(). Only activation
// clears Creator's pending flag after setValue returns.
function listenForJsonEdits(buffer: JsonBuffer, onModified: () => void) {
  const { model } = buffer;
  const session = model.aceEditor.getSession();
  let listening = true;
  const checkEdit = () => {
    if (!listening || !model.isJSONChanged || buffer.modified) return;
    if (model.text === buffer.savedText) return;
    buffer.modified = true;
    onModified();
  };
  const onChange = () => {
    if (model.isProcessingImmediately) queueMicrotask(checkEdit);
    else checkEdit();
  };
  session.on("change", onChange);
  return () => {
    listening = false;
    session.off("change", onChange);
  };
}

function useJsonSaveBuffer() {
  const activeBuffer = useRef<JsonBuffer | null>(null);
  const latestSave = useRef(0);
  const captureJsonSave = useCallback(() => {
    const save = ++latestSave.current;
    const buffer = activeBuffer.current;
    const submitted = buffer?.model.text;
    return () => {
      if (activeBuffer.current !== buffer || save !== latestSave.current) return false;
      if (!buffer || submitted === undefined) return true;
      buffer.savedText = submitted;
      buffer.modified = buffer.model.text !== submitted;
      return !buffer.modified;
    };
  }, []);
  const prepareSave = usePrepareSave(activeBuffer, captureJsonSave);
  return { activeBuffer, captureJsonSave, prepareSave };
}

function usePrepareSave(activeBuffer: React.RefObject<JsonBuffer | null>, captureJsonSave: () => () => boolean) {
  return useCallback((creator: SurveyCreatorModel | null) => {
    const validated = getJsonModel(creator);
    if (Result.isError(validated)) return validated;
    const buffer = activeBuffer.current;
    const request = prepareDefinitionSave(creator, validated.value, buffer ? editorText(buffer) : undefined);
    if (Result.isError(request)) return request;
    const acknowledgeBuffer = captureJsonSave();
    return Result.success({
      payload: request.value.payload,
      acknowledge: () => {
        if (activeBuffer.current !== buffer) return false;
        const saved = request.value.acknowledge();
        return acknowledgeBuffer() && saved;
      },
    });
  }, [activeBuffer, captureJsonSave]);
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
  const { activeBuffer, captureJsonSave, prepareSave } = useJsonSaveBuffer();
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
        const buffer = activeBuffer.current;
        if (buffer?.modified) conversionSession(creator)?.acceptEditorText(editorText(buffer));
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

        const onPropertyChanged = (
          _sender: Base,
          options: IPropertyValueChangedEvent,
        ) => {
          const { name } = options;

          if (name === JSON_EDITOR_PROPERTY_NAMES.hasErrors) {
            notify({ hasErrors: jsonTabBlocks(model) });
          }

          if (!unsubscribe && model.aceEditor) {
            unsubscribe = listenForJsonEdits(buffer, () =>
              notify({ hasErrors: jsonTabBlocks(model) }),
            );
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

  return { registerJsonEditor, getJsonModel, captureJsonSave, prepareSave };
}
