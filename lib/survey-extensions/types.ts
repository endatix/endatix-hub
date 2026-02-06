import type { ComponentType } from "react";
import type { ICustomQuestionTypeConfiguration, Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";

/**
 * Extension lifecycle phases
 */
export type ExtensionLifecycle = "init" | "runner" | "creator";

/**
 * Complete extension definition
 *
 * This is the recommended format for all extensions.
 * Supports smart detection, lazy loading, and lifecycle hooks.
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
   * Server-side detection function.
   * Analyzes form JSON to determine if this extension is needed.
   * Used for smart preloading optimization.
   *
   * @param formJson - The form definition JSON
   * @returns true if this extension is required for the form
   *
   * @example
   * // Always include (for global patches)
   * detect: () => true
   *
   * @example
   * // Include only if form uses specific question type
   * detect: (json) => formUsesQuestionType(json, 'audio-recorder')
   */
  detect?: (formJson: any) => boolean;

  /**
   * Dynamic import function for lazy loading.
   * Used for preloading the extension chunk before rendering.
   *
   * @returns Promise resolving to the extension module
   *
   * @example
   * loader: () => import('./my-extension-logic')
   */
  loader?: () => Promise<any>;

  /**
   * React component for rendering (question extensions only).
   * Supports both static imports and next/dynamic for lazy loading.
   */
  Component?: ComponentType<any>;


  /**
   * Lifecycle hooks
   */
  hooks?: {
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
  };
}

export type { ExtensionDefinition as Extension };
