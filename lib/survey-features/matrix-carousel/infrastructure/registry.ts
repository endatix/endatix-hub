import type { Question, SurveyModel } from "survey-core";
import { Serializer } from "survey-core";
import { getAllSelectBasedQuestions } from "@/lib/survey-features/question-loops/loop-utils";
import { getCarryForwardSourceQuestions } from "@/lib/survey-features/carry-forward/utils/carry-forward-target-query";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "@/lib/survey-features/carry-forward/constants";
import {
  CARRY_FORWARD_MODE_VALUES,
  DEFAULT_CARRY_FORWARD_MODE,
} from "@/lib/survey-features/carry-forward/carry-forward-mode-values";
import {
  formatSourceChoiceLabel,
  getStaticChoicesFromSources,
  hasDataListSource,
} from "@/lib/survey-features/data-lists/utils/property-grid-source-choices";
import {
  ALLOW_SWIPE_NAVIGATION_PROPERTY,
  DISPLAY_MODE_CAROUSEL,
  DISPLAY_MODE_GRID,
  DISPLAY_MODE_PROPERTY,
  GRID_ONLY_PROPERTIES,
  IMAGE_URL_PROPERTY,
  ITEM_VALUE_CLASS,
  MATRIX_TYPE,
  PROGRESS_INDICATOR_BAR,
  PROGRESS_INDICATOR_TEXT,
  PROGRESS_INDICATOR_TYPE_PROPERTY,
  ROWS_PROPERTY_NAME,
  SHOW_NAVIGATION_BUTTONS_PROPERTY,
  SHOW_PROGRESS_INDICATOR_PROPERTY,
} from "../constants";

let isMatrixCarouselRegistryInitialized = false;

function isCarouselMode(obj: { edxDisplayMode?: string }): boolean {
  return obj.edxDisplayMode === DISPLAY_MODE_CAROUSEL;
}

function isRowSourceEnabled(obj: {
  edxDisplayMode?: string;
  edxCarryForwardEnabled?: boolean;
}): boolean {
  return isCarouselMode(obj) && obj.edxCarryForwardEnabled === true;
}

/**
 * True for an ItemValue that is specifically a matrix row (not a matrix
 * column, and not a checkbox/radiogroup/dropdown/ranking choice — all of
 * which share the same itemvalue class). Verified at runtime: a matrix row's
 * `locOwner` is the owning matrix question and `ownerPropertyName` is
 * "rows"; columns report "columns", other question types report their own
 * property name ("choices", etc.).
 */
function isMatrixRowItem(item: {
  locOwner?: { getType?: () => string };
  ownerPropertyName?: string;
}): boolean {
  return (
    item.locOwner?.getType?.() === MATRIX_TYPE &&
    item.ownerPropertyName === ROWS_PROPERTY_NAME
  );
}

function hasMatrixCarouselSerializerProperties(): boolean {
  return (
    Boolean(Serializer.findProperty(MATRIX_TYPE, DISPLAY_MODE_PROPERTY)) &&
    Boolean(Serializer.findProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY))
  );
}

/**
 * Registers Serializer metadata for carousel mode directly on the existing
 * `matrix` type — no new question type, no redeclaration of `rows` (that was
 * tried and confirmed to silently no-op: Serializer.addProperty on an
 * existing property name does not change its declared item class). Must stay
 * React-free: PDF export imports this module directly without
 * survey-react-ui.
 */
export function registerMatrixCarouselSchema(): void {
  if (
    isMatrixCarouselRegistryInitialized &&
    hasMatrixCarouselSerializerProperties()
  ) {
    return;
  }

  if (!Serializer.findProperty(MATRIX_TYPE, DISPLAY_MODE_PROPERTY)) {
    Serializer.addProperty(MATRIX_TYPE, {
      name: DISPLAY_MODE_PROPERTY,
      displayName: "Presentation",
      category: "general",
      type: "string",
      choices: [DISPLAY_MODE_GRID, DISPLAY_MODE_CAROUSEL],
      default: DISPLAY_MODE_GRID,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: SHOW_PROGRESS_INDICATOR_PROPERTY,
      displayName: "Show progress indicator",
      category: "general",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: PROGRESS_INDICATOR_TYPE_PROPERTY,
      displayName: "Progress indicator type",
      category: "general",
      type: "string",
      choices: [PROGRESS_INDICATOR_TEXT, PROGRESS_INDICATOR_BAR],
      default: PROGRESS_INDICATOR_TEXT,
      visibleIf: (obj: { edxDisplayMode?: string; showProgressIndicator?: boolean }) =>
        isCarouselMode(obj) && obj.showProgressIndicator !== false,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: SHOW_NAVIGATION_BUTTONS_PROPERTY,
      displayName: "Show Back/Next buttons",
      category: "general",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: ALLOW_SWIPE_NAVIGATION_PROPERTY,
      displayName: "Allow swipe navigation",
      category: "general",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    // Row-sourcing reuses carry-forward's actual property names, mode
    // values, and choices-picker logic (the same feature checkbox/
    // radiogroup/dropdown/etc. already expose) rather than a bespoke,
    // matrix-only shape — see sync-rows-from-source.ts, which runs the exact
    // same aggregation pipeline (compute-carry-forward-items.ts) carry-
    // forward's own choices-based sync uses. Category "rows" (not a bespoke
    // "rowSource" section) puts these alongside the Rows a scripter is
    // already editing, matching where carry-forward itself lives relative
    // to Choices on a select-base question.
    Serializer.addProperty(MATRIX_TYPE, {
      name: CARRY_FORWARD_ENABLED_PROPERTY,
      displayName: "Carry forward from other questions",
      category: "rows",
      type: "boolean",
      default: false,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: CARRY_FORWARD_SOURCES_PROPERTY,
      displayName: "Copy rows from questions",
      category: "rows",
      type: "multiplevalues",
      visibleIf: isRowSourceEnabled,
      // Same dynamic-picker mechanism carry-forward's own SOURCES_PROPERTY
      // uses (carry-forward-properties.ts), reused via the same
      // getAllSelectBasedQuestions helper — not duplicated here. Safe for
      // both Creator (invoked by the property grid) and plain respondent
      // Models (a `choices` function is simply never called outside Creator).
      choices: (
        obj: { survey?: SurveyModel; name?: string },
        choicesCallback: (choices: { value: string; text: string }[]) => void,
      ) => {
        if (!obj?.survey || typeof choicesCallback !== "function") {
          return;
        }

        const options = getAllSelectBasedQuestions(obj.survey)
          .filter((q) => q.name !== obj.name)
          .map((q) => ({ value: q.name, text: q.name }));

        choicesCallback(options);
      },
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: CARRY_FORWARD_MODE_PROPERTY,
      displayName: "Which rows to include",
      category: "rows",
      type: "string",
      default: DEFAULT_CARRY_FORWARD_MODE,
      choices: [...CARRY_FORWARD_MODE_VALUES],
      visibleIf: isRowSourceEnabled,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
      displayName: "Priority items",
      category: "rows",
      type: "multiplevalues",
      visibleIf: isRowSourceEnabled,
      // Same priority-picker mechanism carry-forward's own
      // PRIORITY_ITEMS_PROPERTY uses, reused directly rather than
      // reimplemented — including its data-list source exclusion.
      choices: (
        obj: { survey?: SurveyModel; edxCarryForwardSources?: string[] },
        choicesCallback: (choices: { value: string; text: string }[]) => void,
      ) => {
        const { survey, edxCarryForwardSources } = obj || {};

        if (!survey || !edxCarryForwardSources || typeof choicesCallback !== "function") {
          return;
        }

        const sourceQuestions = getCarryForwardSourceQuestions(survey, {
          edxCarryForwardSources,
        });

        if (hasDataListSource(sourceQuestions)) {
          choicesCallback([]);
          return;
        }

        choicesCallback(
          getStaticChoicesFromSources(sourceQuestions, "", formatSourceChoiceLabel),
        );
      },
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: CARRY_FORWARD_MAX_CHOICES_PROPERTY,
      displayName: "Maximum number of rows",
      category: "rows",
      type: "number",
      default: 0,
      minValue: 0,
      visibleIf: isRowSourceEnabled,
    });

    // Declutter carousel mode's property grid without touching grid-mode
    // matrix questions: visibleIf only hides the property in the grid, it
    // does not deserialize/remove it, so existing grid-mode JSON using these
    // properties keeps working unchanged.
    GRID_ONLY_PROPERTIES.forEach((name) => {
      Serializer.addProperty(MATRIX_TYPE, {
        name,
        visibleIf: (obj: { edxDisplayMode?: string }) => !isCarouselMode(obj),
      });
    });
  }

  if (!Serializer.findProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY)) {
    // Declared on the shared itemvalue base (matrix has no row-specific item
    // class) but visibleIf-gated to matrix rows only, so radiogroup/checkbox/
    // dropdown/ranking choices and matrix's own columns don't show an Image
    // field they have no use for. Must be type "file", not "image" — the
    // wrong type silently degrades to a plain textbox with no upload button.
    // showMode "form" is required because a property-grid matrix cell cannot
    // host the fileedit control.
    Serializer.addProperty(ITEM_VALUE_CLASS, {
      name: IMAGE_URL_PROPERTY,
      type: "file",
      displayName: "Image",
      showMode: "form",
      visibleIf: isMatrixRowItem,
    });
  }

  isMatrixCarouselRegistryInitialized = true;
}

export function resetMatrixCarouselRegistryForTests(): void {
  [
    DISPLAY_MODE_PROPERTY,
    SHOW_PROGRESS_INDICATOR_PROPERTY,
    PROGRESS_INDICATOR_TYPE_PROPERTY,
    SHOW_NAVIGATION_BUTTONS_PROPERTY,
    ALLOW_SWIPE_NAVIGATION_PROPERTY,
    CARRY_FORWARD_ENABLED_PROPERTY,
    CARRY_FORWARD_SOURCES_PROPERTY,
    CARRY_FORWARD_MODE_PROPERTY,
    CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
    CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ].forEach((name) => {
    if (Serializer.findProperty(MATRIX_TYPE, name)) {
      Serializer.removeProperty(MATRIX_TYPE, name);
    }
  });

  GRID_ONLY_PROPERTIES.forEach((name) => {
    Serializer.addProperty(MATRIX_TYPE, { name, visibleIf: undefined });
  });

  if (Serializer.findProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY)) {
    Serializer.removeProperty(ITEM_VALUE_CLASS, IMAGE_URL_PROPERTY);
  }

  isMatrixCarouselRegistryInitialized = false;
}
