import type { Question } from "survey-core";
import { Serializer } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import {
  ALLOW_SWIPE_NAVIGATION_PROPERTY,
  DISPLAY_MODE_CAROUSEL,
  DISPLAY_MODE_GRID,
  DISPLAY_MODE_PROPERTY,
  EDX_ROWS_SOURCE_ENABLED_PROPERTY,
  EDX_ROWS_SOURCE_QUESTION_PROPERTY,
  EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY,
  GRID_ONLY_PROPERTIES,
  IMAGE_URL_PROPERTY,
  ITEM_VALUE_CLASS,
  MATRIX_TYPE,
  PROGRESS_INDICATOR_BAR,
  PROGRESS_INDICATOR_TEXT,
  PROGRESS_INDICATOR_TYPE_PROPERTY,
  ROWS_PROPERTY_NAME,
  ROWS_SOURCE_SELECTION_ALL,
  ROWS_SOURCE_SELECTION_SELECTED_ONLY,
  ROWS_SOURCE_SELECTION_UNSELECTED_ONLY,
  SHOW_NAVIGATION_BUTTONS_PROPERTY,
  SHOW_PROGRESS_INDICATOR_PROPERTY,
} from "../constants";

let isMatrixCarouselRegistryInitialized = false;

function isCarouselMode(obj: { edxDisplayMode?: string }): boolean {
  return obj.edxDisplayMode === DISPLAY_MODE_CAROUSEL;
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
      category: "carousel",
      type: "string",
      choices: [DISPLAY_MODE_GRID, DISPLAY_MODE_CAROUSEL],
      default: DISPLAY_MODE_GRID,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: SHOW_PROGRESS_INDICATOR_PROPERTY,
      displayName: "Show progress indicator",
      category: "carousel",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: PROGRESS_INDICATOR_TYPE_PROPERTY,
      displayName: "Progress indicator type",
      category: "carousel",
      type: "string",
      choices: [PROGRESS_INDICATOR_TEXT, PROGRESS_INDICATOR_BAR],
      default: PROGRESS_INDICATOR_TEXT,
      visibleIf: (obj: { edxDisplayMode?: string; showProgressIndicator?: boolean }) =>
        isCarouselMode(obj) && obj.showProgressIndicator !== false,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: SHOW_NAVIGATION_BUTTONS_PROPERTY,
      displayName: "Show Back/Next buttons",
      category: "carousel",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: ALLOW_SWIPE_NAVIGATION_PROPERTY,
      displayName: "Allow swipe navigation",
      category: "carousel",
      type: "boolean",
      default: true,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: EDX_ROWS_SOURCE_ENABLED_PROPERTY,
      displayName: "Source rows from another question",
      category: "rowSource",
      type: "boolean",
      default: false,
      visibleIf: isCarouselMode,
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: EDX_ROWS_SOURCE_QUESTION_PROPERTY,
      displayName: "Source question",
      category: "rowSource",
      type: "string",
      visibleIf: (obj: { edxDisplayMode?: string; edxRowsSourceEnabled?: boolean }) =>
        isCarouselMode(obj) && obj.edxRowsSourceEnabled === true,
      // Dynamic dropdown of eligible source questions instead of a free-text
      // field, same mechanism carry-forward's own SOURCES_PROPERTY uses
      // (carry-forward-properties.ts). Safe for both Creator (invoked by the
      // property grid) and plain respondent Models (a `choices` function on
      // a `type:"string"` property is simply never called outside Creator).
      choices: (
        obj: { survey?: { getAllQuestions: () => Question[] }; name?: string },
        choicesCallback: (choices: { value: string; text: string }[]) => void,
      ) => {
        if (!obj?.survey || typeof choicesCallback !== "function") {
          return;
        }

        const options = obj.survey
          .getAllQuestions()
          .filter((q) => isSelectBaseQuestion(q) && q.name !== obj.name)
          .map((q) => ({ value: q.name, text: q.name }));

        choicesCallback(options);
      },
    });

    Serializer.addProperty(MATRIX_TYPE, {
      name: EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY,
      displayName: "Which answers to pull in",
      category: "rowSource",
      type: "string",
      choices: [
        ROWS_SOURCE_SELECTION_ALL,
        ROWS_SOURCE_SELECTION_SELECTED_ONLY,
        ROWS_SOURCE_SELECTION_UNSELECTED_ONLY,
      ],
      default: ROWS_SOURCE_SELECTION_ALL,
      visibleIf: (obj: { edxDisplayMode?: string; edxRowsSourceEnabled?: boolean }) =>
        isCarouselMode(obj) && obj.edxRowsSourceEnabled === true,
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
    EDX_ROWS_SOURCE_ENABLED_PROPERTY,
    EDX_ROWS_SOURCE_QUESTION_PROPERTY,
    EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY,
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
