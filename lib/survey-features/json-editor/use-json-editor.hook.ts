"use client";

import { useCallback } from "react";
import type { Base, IPropertyValueChangedEvent } from "survey-core";
import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
  TabJsonEditorBasePlugin,
} from "survey-creator-core";

export interface JsonEditorState {
  hasErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
}

export interface UseJsonEditorOptions {
  onJsonStateChange?: (state: JsonEditorState) => void;
}

const JSON_EDITOR_PLUGIN = {
  name: "json",
  propertyNames: {
    hasErrors: "hasErrors",
    aceCanUndo: "aceCanUndo",
  } as const,
} as const;

/**
 * Registers JSON editor state and change handling with the Survey Creator.
 * Uses the plugin model's hasErrors and aceCanUndo (ACE) from onPropertyChanged.
 * Does not subscribe to creator.onModified; the consumer should do that for unsaved state.
 *
 * @param options.onJsonStateChange - Called when JSON tab or validation state changes.
 * @returns { registerJsonEditor } - Call with creator; returns cleanup.
 */
export function useJsonEditor(options: UseJsonEditorOptions) {
  const { onJsonStateChange } = options;

  const registerJsonEditor = useCallback(
    (creator: SurveyCreatorModel): (() => void) => {
      let removeModelListener: (() => void) | undefined;
      let isOnJsonTab = false;
      const isJsonModified = { current: false };
      const fileImportedRef = { current: false };

      const notifyState = (hasErrors: boolean) => {
        onJsonStateChange?.({
          hasErrors,
          isOnJsonTab,
          isJsonModified: isJsonModified.current,
        });
      };

      const handleTabChanged = (
        sender: SurveyCreatorModel,
        tabOptions: ActiveTabChangedEvent,
      ) => {
        if (tabOptions.tabName !== JSON_EDITOR_PLUGIN.name) {
          removeModelListener?.();
          removeModelListener = undefined;
          isOnJsonTab = false;
          isJsonModified.current = false;
          onJsonStateChange?.({
            hasErrors: false,
            isOnJsonTab: false,
            isJsonModified: false,
          });
          return;
        }

        isOnJsonTab = true;
        const jsonPlugin = creator.getPlugin(
          JSON_EDITOR_PLUGIN.name,
        ) as TabJsonEditorBasePlugin;
        const originalImportFromFile =
          jsonPlugin.importFromFile.bind(jsonPlugin);
        jsonPlugin.importFromFile = (
          file: File,
          callback?: (json: string) => void,
        ) => {
          fileImportedRef.current = true;
          originalImportFromFile(file, callback);
        };

        if (!jsonPlugin?.model) {
          onJsonStateChange?.({
            hasErrors: false,
            isOnJsonTab: true,
            isJsonModified: isJsonModified.current,
          });
          return;
        }

        notifyState(!!jsonPlugin.model.hasErrors);

        const handler = (
          _sender: Base,
          propertyOptions: IPropertyValueChangedEvent,
        ) => {
          const { name, newValue } = propertyOptions;
          let shouldNotify = false;
          const state: JsonEditorState = {
            hasErrors: !!jsonPlugin.model.hasErrors,
            isOnJsonTab: true,
            isJsonModified: isJsonModified.current,
          };

          if (name === JSON_EDITOR_PLUGIN.propertyNames.hasErrors) {
            state.hasErrors = !!newValue;
            shouldNotify = true;
          }
          
          const isJsonTextDifferent = jsonPlugin.model.text?.length > 0 && jsonPlugin.model.text !== sender.text;
          if (isJsonTextDifferent) {
            state.isJsonModified = true;
            isJsonModified.current = true;
            shouldNotify = true;
          }

          if (fileImportedRef.current) {
            state.isJsonModified = true;
            isJsonModified.current = true;
            fileImportedRef.current = false;
            shouldNotify = true;
          }

          if (shouldNotify) {
            onJsonStateChange?.(state);
          }
        };

        jsonPlugin.model.onPropertyChanged.add(handler);
        removeModelListener = () => {
          jsonPlugin.model?.onPropertyChanged.remove(handler);
        };
      };

      creator.onActiveTabChanged.add(handleTabChanged);

      if (creator.activeTab === JSON_EDITOR_PLUGIN.name) {
        handleTabChanged(creator, {
          tabName: JSON_EDITOR_PLUGIN.name,
        } as ActiveTabChangedEvent);
      }

      return () => {
        creator.onActiveTabChanged.remove(handleTabChanged);
        removeModelListener?.();
      };
    },
    [onJsonStateChange],
  );

  return { registerJsonEditor };
}
