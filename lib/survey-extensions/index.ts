/**
 * @endatix/survey-extensions
 *
 * Core extension system for customizing SurveyJS behavior in Endatix.
 * Use useExtensionLoader (or useSurveyExtensions) hook
 * and pass onModelCreated into your survey model hook.
 */

export type {
  ExtensionDefinition,
  Extension,
  ExtensionModule as ExtensionImplementation,
  ExtensionRuntimeDeps,
} from "./types";

export { useExtensionLoader } from "./ui/use-extension-loader";

export {
  useSurveyExtensions,
  type UseSurveyExtensionsOptions,
  ALL_EXTENSIONS,
} from "./ui/use-survey-extensions";

export {
  coreExtensions,
  getCoreExtensionById,
  getAllCoreExtensions,
  DATA_LISTS_RUNTIME_EXTENSION_ID,
} from "./core-registry";

export {
  extractQuestionTypes,
  createFormAnalyzer,
  type FormAnalyzer,
} from "./extension-utils";

export { userExtensions } from "@/extensions/user-extensions";
