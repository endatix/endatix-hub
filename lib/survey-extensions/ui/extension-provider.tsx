"use client";

import { createContext, useContext, useMemo, useRef } from "react";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import {
  ExtensionRegistry,
  extensionRegistry,
} from "../infrastructure/extension-registry";
import type { ExtensionImplementation } from "../types";

interface ExtensionContextValue {
  registry: ExtensionRegistry;
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null);

interface ExtensionProviderProps {
  implementations: Map<string, ExtensionImplementation>;
  children: React.ReactNode;
}

/**
 * Extension Provider - Manages extension lifecycle and context
 *
 * Initializes extensions once at app start and provides context
 * to child components for applying extensions to models/creators.
 */
export function ExtensionProvider({
  implementations,
  children,
}: ExtensionProviderProps) {
  const initializedRef = useRef(false);
  const contextValue = useMemo(() => {
    if (!initializedRef.current) {
      extensionRegistry.registerImplementations(implementations);
      extensionRegistry.initializeExtensions();

      initializedRef.current = true;
    }

    return { registry: extensionRegistry };
  }, [implementations]);

  return <ExtensionContext value={contextValue}>{children}</ExtensionContext>;
}

/**
 * Base hook to access extension context
 * Internal use only - use specialized hooks below
 */
export function useExtensionContext() {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error("Must be used within ExtensionProvider (SurveyExtensions)");
  }
  return context;
}

/**
 * Hook for public survey forms (Survey Runner)
 *
 * **Use this in:** Public form pages, submission views, form previews
 *
 * Provides a helper to apply form-scoped extension hooks like analytics,
 * validation, and event handlers to Survey Model instances.
 *
 * @example
 * // In use-survey-model.hook.ts
 * import { useFormExtensions } from '@/lib/survey-extensions';
 *
 * const { applyToModel } = useFormExtensions();
 * const model = new Model(json);
 * applyToModel(model); // Applies all form extensions
 *
 * @returns Object with `applyToModel` method
 */
export function useFormExtensions() {
  const { registry } = useExtensionContext();

  const applyToModel = (model: Model) => {
    registry.applyFormExtensions(model);
  };

  return { applyToModel };
}

/**
 * Hook for form editor (Survey Creator)
 *
 * **Use this in:** Form designer/editor components
 *
 * Provides a helper to apply editor-scoped extension hooks like toolbox
 * customization, property panels, and editor plugins to SurveyCreator instances.
 *
 * Also automatically applies form extensions to test survey instances within
 * the creator (e.g., when testing forms in the "Test Survey" tab).
 *
 * @example
 * // In form-editor.tsx
 * import { useEditorExtensions } from '@/lib/survey-extensions';
 *
 * const { applyToCreator } = useEditorExtensions();
 * const creator = new SurveyCreator(options);
 * applyToCreator(creator); // Applies all editor extensions
 *
 * @returns Object with `applyToCreator` method
 */
export function useEditorExtensions() {
  const { registry } = useExtensionContext();

  const applyToCreator = (creator: SurveyCreator) => {
    registry.applyEditorExtensions(creator);

    creator.onSurveyInstanceCreated.add((_, options) => {
      try {
        registry.applyFormExtensions(options.survey as Model);
      } catch (error) {
        console.error(
          "[Endatix] Failed to apply extensions to creator test survey:",
          error,
        );
      }
    });
  };

  return { applyToCreator };
}

/**
 * Advanced hook to access the extension registry directly
 *
 * **Use this when:** You need direct access to registry methods or metadata
 *
 * Majority of cases, you should use the specialized hooks above (`useFormExtensions`
 * or `useEditorExtensions`) instead. This hook is for advanced use cases like:
 * - Debugging which extensions are loaded
 * - Inspecting extension metadata
 * - Building custom extension management UI
 *
 * @example
 * // Advanced: Check which extensions are loaded
 * const registry = useExtensions();
 * const definitions = registry.getAllDefinitions();
 * const implementations = registry.getAllImplementations();
 *
 * @returns The ExtensionRegistry instance
 */
export function useExtensions(): ExtensionRegistry {
  const { registry } = useExtensionContext();
  return registry;
}
