"use client";

import { useCallback } from "react";
import { Base, Model, type IPropertyValueChangedEvent } from "survey-core";
import {
  TabJsonEditorAcePlugin,
  type ActiveTabChangedEvent,
  type SurveyCreatorModel,
  type TabJsonEditorBasePlugin,
} from "survey-creator-core";
import {
  type JsonEditorState,
  AceJsonPlugin,
  JSON_EDITOR_PLUGIN_NAME,
  JSON_EDITOR_PROPERTY_NAMES,
  NOT_ON_JSON_TAB_STATE,
  createOnJsonTabState,
} from "./json-editor-state";
import { Result } from "@/lib/result";

const INVALID_JSON_ERROR_MESSAGE =
  "Please fix the errors in the JSON schema and try again.";
const MALFORMED_JSON_ERROR_MESSAGE =
  "JSON schema is malformed and cannot be parsed.";
const UNEXPECTED_ERROR_MESSAGE =
  "Unexpeted error. Please reload the page and try again.";

export type { JsonEditorState } from "./json-editor-state";

export interface UseJsonEditorOptions {
  onJsonStateChange?: (state: JsonEditorState) => void;
}

/**
 * Registers JSON editor state and change handling with the Survey Creator.
 * Subscribes to the plugin model's onPropertyChanged for hasErrors and aceCanUndo.
 * Does not subscribe to creator.onModified; the consumer should do that for unsaved state.
 *
 * @param options.onJsonStateChange - Called when JSON tab, validation, or modified state changes.
 * @returns { registerJsonEditor } - Call with creator; returns cleanup.
 */
export function useJsonEditor(options: UseJsonEditorOptions) {
  const { onJsonStateChange } = options;

  const registerJsonEditor = useCallback(
    (creator: SurveyCreatorModel): (() => void) => {
      let isJsonModified = false;
      let removeModelListener: (() => void) | undefined;
      let aceChangedHandler: (() => void) | undefined;

      function notify(overrides: Partial<JsonEditorState>) {
        onJsonStateChange?.(
          createOnJsonTabState({ isJsonModified, ...overrides }),
        );
      }

      function leaveJsonTab() {
        removeModelListener?.();
        removeModelListener = undefined;
        isJsonModified = false;
        notify(NOT_ON_JSON_TAB_STATE);
      }

      function enterJsonTab() {
        const jsonPlugin: TabJsonEditorBasePlugin = creator.getPlugin(
          JSON_EDITOR_PLUGIN_NAME,
        );
        const model = jsonPlugin?.model as unknown as AceJsonPlugin;
        const hasAceEditor = TabJsonEditorAcePlugin.hasAceEditor();
        if (!model || !hasAceEditor) return;

        let isAceHooked = false;

        const onPropertyChanged = (
          sender: Base,
          options: IPropertyValueChangedEvent,
        ) => {
          const { name } = options;

          if (name === JSON_EDITOR_PROPERTY_NAMES.hasErrors) {
            notify({ hasErrors: !!options.newValue });
          }

          const aceInstance = (sender as AceJsonPlugin).aceEditor;
          if (aceInstance && !isAceHooked) {
            isAceHooked = true;

            aceChangedHandler = () => {
              if (!isJsonModified) {
                const session = aceInstance.getSession();
                const editorValue = session.$editor.getValue();

                if (editorValue?.length < 1 || editorValue === creator.text)
                  return;

                isJsonModified = true;
                notify({ hasErrors: !!model.hasErrors });
              }
            };
            aceInstance.getSession().on("change", aceChangedHandler);
          }
        };

        model.onPropertyChanged.add(onPropertyChanged);

        removeModelListener = () => {
          model?.onPropertyChanged.remove(onPropertyChanged);
          const aceInstance = model.aceEditor;
          if (aceInstance && aceChangedHandler) {
            aceInstance.getSession().off("change", aceChangedHandler);
          }
        };

        notify({ hasErrors: !!model.hasErrors });
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

      creator.onActiveTabChanged.add(onTabChanged);

      return () => {
        creator.onActiveTabChanged.remove(onTabChanged);
        removeModelListener?.();
      };
    },
    [onJsonStateChange],
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

      if (jsonPlugin.model.hasErrors) {
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

  return { registerJsonEditor, getJsonModel };
}
