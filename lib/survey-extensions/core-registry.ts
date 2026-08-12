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
import {
  MATRIX_CAROUSEL_EXTENSION_ID,
  matrixCarouselExtension,
} from "@/lib/survey-features/matrix-carousel";
import { DRAG_CATEGORIZE_EXTENSION_ID } from "@/lib/questions/drag-categorize/constants";
// The extension module, not the feature barrel — the barrel re-exports the
// Creator bindings, which must not reach the respondent graph.
import { dragCategorizeExtension } from "@/lib/questions/drag-categorize/drag-categorize.extension";

export const DATA_LISTS_RUNTIME_EXTENSION_ID = "data-lists-runtime";
export {
  CARRY_FORWARD_EXTENSION_ID,
  BLIND_SEARCH_TAGBOX_EXTENSION_ID,
  REGEX_MATCH_EXTENSION_ID,
  DRAG_CATEGORIZE_EXTENSION_ID,
  MATRIX_CAROUSEL_EXTENSION_ID,
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
  {
    id: MATRIX_CAROUSEL_EXTENSION_ID,
    type: "feature",
    loading: "static",
    module: matrixCarouselExtension,
    metadata: {
      name: "Matrix Carousel",
      description:
        "Adds a swipeable, one-statement-per-screen carousel presentation to the Matrix question type.",
    },
  },
  {
    // Static, with no shouldLoad: registering a question type is a Serializer
    // and ReactQuestionFactory call, cheap next to parsing the form itself.
    // Gating it cost a regex scan of the whole form JSON plus a chunk
    // round-trip. `dynamic` + `shouldLoad` is for tenant extensions in
    // user-extensions.ts whose bundles are genuinely large or rare.
    //
    // The Creator bindings stay out of the respondent graph regardless — the
    // extension module imports them dynamically in onCreatorReady.
    id: DRAG_CATEGORIZE_EXTENSION_ID,
    type: "question",
    loading: "static",
    module: dragCategorizeExtension,
    metadata: {
      name: "Drag Categorize",
      description:
        "Drag-and-drop question letting respondents categorize items into named zones.",
      category: "choice",
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
