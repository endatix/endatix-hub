"use client";

import { useCallback, useState } from "react";
import { Model, type Base, type IPropertyValueChangedEvent } from "survey-core";
import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
  TabJsonEditorBasePlugin,
} from "survey-creator-core";
import {
  type JsonEditorState,
  JSON_EDITOR_PLUGIN_NAME,
  NOT_ON_JSON_TAB_STATE,
  computeStateAfterPropertyChange,
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
      const jsonEditorState = {
        isJsonModified: false,
        fileJustImported: false,
      };
      let removeModelListener: (() => void) | undefined;

      function notify(state: JsonEditorState) {
        onJsonStateChange?.(state);
      }

      function leaveJsonTab() {
        removeModelListener?.();
        removeModelListener = undefined;
        jsonEditorState.isJsonModified = false;
        notify(NOT_ON_JSON_TAB_STATE);
      }

      function enterJsonTab() {
        const jsonPlugin: TabJsonEditorBasePlugin = creator.getPlugin(
          JSON_EDITOR_PLUGIN_NAME,
        );

        if (!jsonPlugin?.model) {
          notify(
            createOnJsonTabState({
              isJsonModified: jsonEditorState.isJsonModified,
            }),
          );
          return;
        }

        // const originalImportFromFile =
        //   jsonPlugin.importFromFile.bind(jsonPlugin);
        // jsonPlugin.importFromFile = (
        //   file: File,
        //   callback?: (json: string) => void,
        // ) => {
        //   jsonEditorState.fileJustImported = true;
        //   originalImportFromFile(file, callback);
        // };

        notify(
          createOnJsonTabState({
            hasErrors: !!jsonPlugin.model.hasErrors,
            isJsonModified: jsonEditorState.isJsonModified,
          }),
        );

        let isAceHooked = false;

        const onPropertyChanged = (
          _sender: Base,
          options: IPropertyValueChangedEvent,
        ) => {
          const { name, newValue } = options;
          const aceInstance =
            (_sender as any).aceEditor || (_sender as any).editor;

          if (aceInstance && !isAceHooked) {
            isAceHooked = true;

            // Hook the Session for REAL text changes (typing & clipboard)
            aceInstance.getSession().on("change", () => {
              if (!jsonEditorState.isJsonModified) {
                jsonEditorState.isJsonModified = true;
                notify(
                  createOnJsonTabState({
                    hasErrors: !!jsonPlugin.model.hasErrors,
                    isJsonModified: true,
                  }),
                );
              }
            });
          }

          const isJsonTextDifferent =
            jsonPlugin.model.text?.length > 0 &&
            jsonPlugin.model.text !== creator.text;
          const next = computeStateAfterPropertyChange({
            propertyName: name,
            newValue,
            hasErrorsFromModel: !!jsonPlugin.model.hasErrors,
            isJsonModifiedCurrent: jsonEditorState.isJsonModified,
            isJsonTextDifferent,
            fileJustImported: jsonEditorState.fileJustImported,
          });

          if (next === null) return;

          jsonEditorState.isJsonModified = next.isJsonModified;
          jsonEditorState.fileJustImported = false;
          notify(next);
        };

        jsonPlugin.model.onPropertyChanged.add(onPropertyChanged);

        removeModelListener = () => {
          jsonPlugin.model?.onPropertyChanged.remove(onPropertyChanged);
        };
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
