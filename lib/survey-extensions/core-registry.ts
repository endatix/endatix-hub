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
import {
  BLIND_SEARCH_TAGBOX_EXTENSION_ID,
  blindSearchTagboxExtension,
} from "@/lib/survey-features/blind-search-tagbox";
import {
  REGEX_MATCH_EXTENSION_ID,
  regexMatchExtension,
} from "@/lib/survey-features/regex-match";
import {
  CARRY_FORWARD_EXTENSION_ID,
  carryForwardExtension,
} from "@/lib/survey-features/carry-forward";

export const DATA_LISTS_RUNTIME_EXTENSION_ID = "data-lists-runtime";
export {
  CARRY_FORWARD_EXTENSION_ID,
  BLIND_SEARCH_TAGBOX_EXTENSION_ID,
  REGEX_MATCH_EXTENSION_ID,
};

/**
 * Core extensions that ship with the platform.
 * Developers should add their extensions to hub/extensions/user-extensions.ts
 * to avoid merge conflicts when updating from upstream.
 * @example
 * {
 *   id: 'hello-world',
 *   type: 'question',
 *   loading: 'dynamic',
 *   shouldLoad: (_, analyzer) => analyzer.usesQuestionType('hello-world'),
 *   load: () =>
 *     import('@/extensions/questions/hello-world').then(
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
    loading: "static",
    module: blindSearchTagboxExtension,
    metadata: {
      name: "Blind Search Tagbox",
      description:
        "Hides tag box choices until the respondent types a minimum number of characters.",
    },
  },
  {
    id: REGEX_MATCH_EXTENSION_ID,
    type: "feature",
    loading: "static",
    module: regexMatchExtension,
    metadata: {
      name: "Regex Match",
      description:
        "Adds regexMatch() for visibleIf and enableIf conditional logic.",
    },
  },
  {
    id: CARRY_FORWARD_EXTENSION_ID,
    type: "feature",
    loading: "static",
    module: carryForwardExtension,
    metadata: {
      name: "Carry forward",
      description:
        "Aggregates choices from multiple source questions with deduplication, priority ordering, and max-selection controls.",
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
