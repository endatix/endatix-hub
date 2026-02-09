import type { Model } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";

/**
 * Extension type. Defines the type of the extension.
 * - feature: Add new features as event handlers for SurveyJS Model or Creator
 * - question: Add new question types to the survey form
 */
export type ExtensionType = "feature" | "question";

import type { FormAnalyzer } from "./extension-utils";

/**
 * Survey extension definition
 *
 * This is the metadata about an extension. It describes what the extension is,
 * where it runs, and how to load it. The actual implementation is loaded lazily.
 */
export interface ExtensionDefinition {
  /**
   * Unique identifier for the extension (e.g. "audio-recorder", "camera-fix")
   */
  id: string;

  /**
   * The type of the extension.
   */
  type: ExtensionType;

  metadata?: {
    name: string;
    title?: string;
    description?: string;
    icon?: string;
    category?: string;
  };

  /**
   * Server-side detection function. Determines if the extension should be loaded for the form.
   * @param formJson - The raw form JSON
   * @param analyzer - optimized analyzer with cached string representation
   */
  shouldLoad?: (formJson: any, analyzer: FormAnalyzer) => boolean;

  /**
   * Dynamic import function for lazy loading.
   * Used for preloading the extension chunk before rendering.
   * @example
   * load: () => import("@/customizations/questions/hello-world").then((module) => module.default)
   * @returns A Promise that resolves to the extension module.
   */
  load?: () => Promise<ExtensionModule>;
}

/**
 * Extension module. This is the actual extension code.
 */
export interface ExtensionModule {
  /** For question-type extensions: the React component to render */
  Component?: React.ComponentType<any>;

  /**
   * Lifecycle hook: Called once when the extension is first loaded.
   * Use this for global registrations (e.g., Serializer, ComponentCollection, QuestionFactory).
   */
  onInit?: () => void;

  /** For SurveyJS Model-type extensions: called when the model is ready */
  onModelReady?: (model: Model) => void;

  /** For SurveyJS Creator-type extensions: called when the creator is ready */
  onCreatorReady?: (creator: SurveyCreatorModel) => void;
}

export type { ExtensionDefinition as Extension };
