"use client";

import { createContext, useContext, useRef } from "react";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import {
  ExtensionRegistry,
  extensionRegistry,
} from "../infrastructure/extension-registry";
import type { ExtensionDefinition } from "../types";

interface ExtensionContextValue {
  registry: ExtensionRegistry;
  extensions: ExtensionDefinition[];
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null);

interface ExtensionProviderProps {
  extensions: ExtensionDefinition[];
  children: React.ReactNode;
}

/**
 * Extension Provider - Manages extension lifecycle and context
 *
 * Initializes extensions once at app start and provides context
 * to child components for applying extensions to models/creators.
 */
export function ExtensionProvider({
  extensions,
  children,
}: ExtensionProviderProps) {
  const initializedRef = useRef(false);

  if (!initializedRef.current) {
    extensionRegistry.registerAll(extensions);
    extensionRegistry.initializeExtensions();

    initializedRef.current = true;
  }

  return (
    <ExtensionContext.Provider
      value={{ registry: extensionRegistry, extensions }}
    >
      {children}
    </ExtensionContext.Provider>
  );
}

/**
 * Base hook to access extension context
 * Use the specialized hooks below for specific use cases
 */
export function useExtensionContext() {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error("Must be used within ExtensionProvider (SurveyExtensions)");
  }
  return context;
}

/**
 * Hook for public forms (Survey Runner)
 *
 * Provides extensions and a helper to apply model hooks.
 * Use this in survey rendering components.
 *
 * @example
 * const { applyToModel } = useSurveyExtensions();
 * const model = new Model(json);
 * applyToModel(model);
 */
export function useSurveyExtensions() {
  const { registry } = useExtensionContext();

  const applyToModel = (model: Model) => {
    registry.applyModelExtensions(model);
  };

  return { applyToModel };
}

/**
 * Hook for form editor (Survey Creator)
 *
 * Provides extensions and a helper to apply creator hooks.
 * Use this in form editor/designer components.
 *
 * @example
 * const { applyToCreator } = useCreatorExtensions();
 * const creator = new SurveyCreator(options);
 * applyToCreator(creator);
 */
export function useCreatorExtensions() {
  const { registry, extensions } = useExtensionContext();

  const applyToCreator = (creator: SurveyCreator) => {
    // Apply creator hooks
    registry.applyCreatorExtensions(creator);

    // Attach model hooks to creator's test survey instances
    extensions.forEach((ext) => {
      if (ext.hooks?.onModelCreated) {
        creator.onSurveyInstanceCreated.add((_, options) => {
          try {
            ext.hooks!.onModelCreated!(options.survey as Model);
          } catch (error) {
            console.error(
              `[Endatix] Extension ${ext.name} failed in creator model hook:`,
              error,
            );
          }
        });
      }
    });
  };

  return { applyToCreator };
}

/**
 * Generic hook to access the extension registry
 * Use the specialized hooks above for most use cases
 */
export function useExtensions(): ExtensionRegistry {
  const { registry } = useExtensionContext();
  return registry;
}
