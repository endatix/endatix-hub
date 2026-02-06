/**
 * @endatix/survey-extensions
 *
 * Core extension system for customizing SurveyJS behavior in Endatix.
 * This module will eventually be extracted as a standalone npm package.
 */

// Core types
export type {
  EndatixExtension,
  QuestionExtension,
  InitExtension,
  ModelExtension,
  CreatorExtension,
  CompositeExtension,
  Extension,
} from "./types";

// Infrastructure
export { extensionRegistry } from "./infrastructure/extension-registry";
export type { ExtensionRegistry } from "./infrastructure/extension-registry";

// React integration
export { ExtensionProvider, useExtensions } from "./ui/extension-provider";
