import { QuestionFactory, Serializer } from "survey-core";
// Imported from the module, not the feature barrel, to keep this server-safe
// path free of UI code.
import { registerCarryForwardForQuestionType } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import {
  ALLOW_MULTIPLE_ZONES_PROPERTY,
  DEFAULT_ZONE_MIN_WIDTH,
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  DRAG_CATEGORIZE_ZONE_CLASS,
  IMAGE_URL_PROPERTY,
  MAX_ITEMS_PROPERTY,
  MIN_ITEMS_PROPERTY,
  REQUIRE_ALL_ITEMS_PROPERTY,
  SHOW_ITEM_LABELS_PROPERTY,
  ZONE_MIN_WIDTH_PROPERTY,
  ZONES_PROPERTY,
} from "./constants";
import { DragCategorizeQuestion } from "./drag-categorize.model";
import {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./drag-categorize.item-values";

/** Inherited select-base props that make no sense for categorization. */
const HIDDEN_SELECT_BASE_PROPERTIES = [
  "showOtherItem",
  "otherText",
  "otherErrorText",
  "otherPlaceholder",
  "storeOthersAsComment",
  "showNoneItem",
  "noneText",
  "showRefuseItem",
  "refuseText",
  "showDontKnowItem",
  "dontKnowText",
  "separateSpecialChoices",
];

/**
 * Registers the item/zone sub-types and the question class with the
 * SurveyJS Serializer + QuestionFactory — the model half of the question,
 * with no React or stylesheet dependency.
 *
 * This module is import-safe on the server: the PDF export pipeline calls
 * it directly so a Model can parse `dragcategorize` JSON without pulling
 * survey-react-ui into a server bundle. Client surfaces should call
 * registerDragCategorizeQuestion (which calls this first) instead.
 */
export function registerDragCategorizeModel(): void {
  if (!Serializer.findClass(DRAG_CATEGORIZE_ITEM_CLASS)) {
    // imageUrl is type "file" — the type SurveyJS itself uses for image
    // properties (`imageLink:file` on imageitemvalue). The Creator's
    // PropertyGridLinkEditor matches "file"/"url" and renders a fileedit
    // control (Select File button + URL field) with storeDataAsText false,
    // which routes uploads through form-editor's registered
    // creator.onUploadFile (useStorageWithCreator → useContentUpload) into
    // blob storage. A type the editor does not recognize silently degrades
    // to a plain text box.
    Serializer.addClass(
      DRAG_CATEGORIZE_ITEM_CLASS,
      [
        {
          name: IMAGE_URL_PROPERTY,
          type: "file",
          displayName: "Image",
          // showMode "form" keeps this out of the Items table columns and
          // puts it in the row's expanded detail panel. A matrix cell cannot
          // host the Creator's `fileedit` control — it degrades to cellType
          // "text", i.e. a URL box with no Select File button. In the detail
          // panel the property renders as a real question and gets the full
          // editor.
          showMode: "form",
        },
        {
          name: `${ALLOW_MULTIPLE_ZONES_PROPERTY}:boolean`,
          default: false,
          displayName: "Allow in multiple zones",
        },
      ],
      (value: unknown) => new DragCategorizeItemValue(value),
      "choiceitem",
    );
  }

  if (!Serializer.findClass(DRAG_CATEGORIZE_ZONE_CLASS)) {
    Serializer.addClass(
      DRAG_CATEGORIZE_ZONE_CLASS,
      [
        {
          name: `${MIN_ITEMS_PROPERTY}:number`,
          default: 0,
          minValue: 0,
          displayName: "Min items (0 = none)",
        },
        {
          name: `${MAX_ITEMS_PROPERTY}:number`,
          default: 0,
          minValue: 0,
          displayName: "Max items (0 = unlimited)",
        },
      ],
      (value: unknown) => new DragCategorizeZoneItemValue(value),
      "itemvalue",
    );
  }

  if (!Serializer.findClass(DRAG_CATEGORIZE_TYPE)) {
    Serializer.addClass(
      DRAG_CATEGORIZE_TYPE,
      [
        {
          name: `choices:${DRAG_CATEGORIZE_ITEM_CLASS}[]`,
          displayName: "Items",
        },
        {
          name: `${ZONES_PROPERTY}:${DRAG_CATEGORIZE_ZONE_CLASS}[]`,
          displayName: "Zones",
          category: "choices",
        },
        {
          name: `${REQUIRE_ALL_ITEMS_PROPERTY}:boolean`,
          default: false,
          category: "validation",
          displayName: "Require all items to be placed",
        },
        {
          name: `${SHOW_ITEM_LABELS_PROPERTY}:boolean`,
          default: true,
          category: "layout",
          displayName: "Show labels under images",
        },
        {
          name: `${ZONE_MIN_WIDTH_PROPERTY}:number`,
          default: DEFAULT_ZONE_MIN_WIDTH,
          minValue: 40,
          category: "layout",
          displayName: "Zone width (px)",
        },
        ...HIDDEN_SELECT_BASE_PROPERTIES.map((name) => ({
          name,
          visible: false,
          isSerializable: false,
        })),
      ],
      () => new DragCategorizeQuestion(""),
      "selectbase",
    );
  }

  // Opt into advanced Carry forward now that the class exists. Must stay
  // after addClass: SurveyJS discards properties added to an unknown class,
  // and carry forward (a static extension) initializes before this question's
  // dynamic extension, so it cannot register us from its own side.
  registerCarryForwardForQuestionType(DRAG_CATEGORIZE_TYPE);

  QuestionFactory.Instance.registerQuestion(
    DRAG_CATEGORIZE_TYPE,
    (name: string) => new DragCategorizeQuestion(name),
  );
}
