import type { ComponentType } from "react";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";

/**
 * Extension scopes. Defines where the extension will run.
 * - form: Runs on the survey form (Survey Model)
 * - editor: Runs on the survey editor (Survey Creator)
 */
export type ExtensionScope = "form" | "editor";

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
   * Human-readable name (e.g. "Audio Recorder", "Camera Facing Mode Fix")
   */
  name: string;

  /**
   * Optional description of what this extension does
   */
  description?: string;

  /**
   * The scopes where the extension will run.
   * - form: Runs on the survey form (Survey Model)
   * - editor: Runs on the survey editor (Survey Creator)
   */
  scopes: ExtensionScope[];

  /**
   * Server-side detection function.
   * Analyzes form JSON to determine if this extension should be activated.
   * Used for smart preloading optimization.
   *
   * @param formJson - The form definition JSON
   * @returns true if the extension should be activated for the form
   *
   * @example
   * // Always activate (for global patches)
   * shouldActivate: () => true
   *
   * @example
   * // Activate only if form uses specific question type
   * shouldActivate: (json) => formUsesQuestionType(json, 'audio-recorder')
   */
  shouldActivate?: (formJson: any) => boolean;

  /**
   * Dynamic import function for lazy loading.
   * Used for preloading the extension chunk before rendering.
   *
   * @returns Promise resolving to the extension implementation
   *
   * @example
   * loader: () => import('./my-extension-logic')
   */
  loader?: () => Promise<ExtensionImplementation>;
}

/**
 * Extension implementation
 *
 * This is the actual code that runs. It's loaded lazily via the loader function.
 * Contains the React component (for questions) and lifecycle hooks.
 */
export interface ExtensionImplementation {
  /**
   * React component for rendering (question extensions only).
   */
  Component?: ComponentType<any>;

  /**
   * Global app initialization (runs once at startup).
   * Use for: Prototype patching, global SurveyJS settings
   */
  onInit?: () => void | Promise<void>;

  /**
   * Form runner initialization (runs per survey instance).
   * Use for: Event handlers, analytics tracking, custom validation
   */
  onModelCreated?: (model: Model) => void;

  /**
   * Form creator initialization (runs per creator instance).
   * Use for: Toolbox customization, property grid setup, editor plugins
   */
  onCreatorCreated?: (creator: SurveyCreator) => void;
}

export type { ExtensionDefinition as Extension };
