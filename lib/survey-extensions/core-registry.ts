/**
 * Core Extensions Registry
 *
 * This file is maintained by Endatix.
 * Contains built-in extensions that ship with the platform.
 *
 * Developers should add their extensions to hub/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 */
import type { ExtensionDefinition } from "./types";
import { expressionFormattingExtension } from "@/lib/survey-features/expression-formatting";
import { dataListsExtension } from "@/lib/survey-features/data-lists";

export const DATA_LISTS_RUNTIME_EXTENSION_ID = "data-lists-runtime";

/**
 * Core extensions that ship with the platform.
 * Developers should add their extensions to hub/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 * @example
 * {
 *   id: 'camera-fix',
 *   type: 'feature',
 *   loading: 'dynamic',
 *   shouldLoad: (_) => true,
 *   load: () =>
 *     import('@/extensions/camera-fix').then(
 *       (module) => module.default,
 *     ),
 * },
 */
export const coreExtensions: ExtensionDefinition[] = [
  {
    id: "expression-formatting",
    type: "feature",
    loading: "static",
    metadata: {
      name: "Expression Formatting",
      description:
        "Adds formatCurrency, formatNumber, formatDate, and smartFormat functions to SurveyJS expressions",
    },
    module: expressionFormattingExtension,
  },
  {
    id: DATA_LISTS_RUNTIME_EXTENSION_ID,
    type: "feature",
    loading: "static",
    metadata: {
      name: "Data Lists Runtime",
      description:
        "Loads dropdown/choice options through Endatix public data-list endpoints.",
    },
    module: dataListsExtension,
  },
];

/**
 * Get extension by ID from core registry
 */
export function getCoreExtensionById(
  id: string,
): ExtensionDefinition | undefined {
  return coreExtensions.find((ext) => ext.id === id);
}

/**
 * Get all core extensions
 */
export function getAllCoreExtensions(): ExtensionDefinition[] {
  return coreExtensions;
}
