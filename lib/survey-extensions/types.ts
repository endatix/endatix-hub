import type { Model } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";

/**
 * Extension type. Defines the type of the extension.
 * - feature: Add new features as event handlers for SurveyJS Model or Creator
 * - question: Add new question types to the survey form
 */
export type ExtensionType = "feature" | "question";
export type ExtensionLoading = "static" | "dynamic";

import type { FormAnalyzer } from "./extension-utils";

interface ExtensionMetadata {
  name: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;
}

interface ExtensionDefinitionBase {
  /**
   * Unique identifier for the extension (e.g. "audio-recorder", "camera-fix")
   */
  id: string;

  /**
   * The type of the extension.
   */
  type: ExtensionType;

  metadata?: ExtensionMetadata;

  /**
   * Server-side detection function. Determines if the extension should be loaded for the form.
   * @param formJson - The raw form JSON
   * @param analyzer - optimized analyzer with cached string representation
   */
  shouldLoad?: (formJson: any, analyzer: FormAnalyzer) => boolean;
}

/**
 * Static extension definition.
 * Use for always-on lightweight initialization registrations.
 */
export interface StaticExtensionDefinition extends ExtensionDefinitionBase {
  loading: "static";

  /**
   * Eager extension module for static loading.
   * @example
   * module: { onInit: () => { registerExpressionFormatting(); } }
   */
  module: ExtensionModule;
}

/**
 * Dynamic extension definition.
 * Use for lazily loaded code-split extension modules.
 */
export interface DynamicExtensionDefinition extends ExtensionDefinitionBase {
  loading: "dynamic";

  /**
   * Dynamic import function for dynamic loading.
   * @example
   * load: () => import("@/customizations/questions/hello-world").then((module) => module.default)
   */
  load: () => Promise<ExtensionModule>;
}

export type ExtensionDefinition =
  | StaticExtensionDefinition
  | DynamicExtensionDefinition;

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
