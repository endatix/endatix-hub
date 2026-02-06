/**
 * @endatix/survey-extensions
 *
 * Core extension system for customizing SurveyJS behavior in Endatix.
 * This module will eventually be extracted as a standalone npm package.
 */

// Core types
export type {
  ExtensionDefinition,
  Extension,
  ExtensionScope,
  ExtensionImplementation,
} from "./types";

// Infrastructure
export { extensionRegistry } from "./infrastructure/extension-registry";
export type { ExtensionRegistry } from "./infrastructure/extension-registry";

// React integration (hooks and provider)
export {
  ExtensionProvider,
  useExtensions,
  useFormExtensions,
  useEditorExtensions,
  useExtensionContext,
} from "./ui/extension-provider";

// Server-side utilities
export {
  getRequiredExtensionIds,
  formUsesQuestionType,
  extractQuestionTypes,
} from "./server/analyzer";

// Core and user registries
export {
  coreExtensions,
  getCoreExtensionById,
  getAllCoreExtensions,
} from "./core-registry";
