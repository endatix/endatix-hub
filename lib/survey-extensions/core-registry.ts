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
import { EDX_HIDE_UNTIL_TYPING_PROPERTY } from "@/lib/survey-features/blind-search-tagbox/constants";

export const DATA_LISTS_RUNTIME_EXTENSION_ID = "data-lists-runtime";
export const BLIND_SEARCH_TAGBOX_EXTENSION_ID = "blind-search-tagbox";

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
  {
    id: BLIND_SEARCH_TAGBOX_EXTENSION_ID,
    type: "feature",
    loading: "dynamic",
    shouldLoad: (_, analyzer) =>
      analyzer.hasCustomProperty(EDX_HIDE_UNTIL_TYPING_PROPERTY),
    load: () =>
      import(
        "@/lib/survey-features/blind-search-tagbox/infrastructure/blind-search-tagbox.extension"
      ).then((module) => module.blindSearchTagboxExtension),
    metadata: {
      name: "Blind Search Tagbox",
      description:
        "Hides tag box choices until the respondent types a minimum number of characters.",
    },
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
