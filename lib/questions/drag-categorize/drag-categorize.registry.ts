import { QuestionFactory, Serializer } from "survey-core";
import {
  ALLOW_MULTIPLE_ZONES_PROPERTY,
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  DRAG_CATEGORIZE_ZONE_CLASS,
  IMAGE_URL_PROPERTY,
  MAX_ITEMS_PROPERTY,
  MIN_ITEMS_PROPERTY,
  REQUIRE_ALL_ITEMS_PROPERTY,
  ZONES_PROPERTY,
} from "../constants";
import { DragCategorizeQuestion } from "./drag-categorize-question.model";
import {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./item-values";

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
 * SurveyJS Serializer + QuestionFactory. Global side effect — runs once
 * from the extension's onInit.
 */
export function registerDragCategorizeGlobals(): void {
  if (!Serializer.findClass(DRAG_CATEGORIZE_ITEM_CLASS)) {
    // imageUrl uses type "image" so the Creator's property grid shows the
    // built-in image picker; form-editor's registered creator.onUploadFile
    // handler (useStorageWithCreator → useContentUpload) stores the file in
    // blob storage and writes back the URL — no extra wiring here.
    Serializer.addClass(
      DRAG_CATEGORIZE_ITEM_CLASS,
      [
        {
          name: IMAGE_URL_PROPERTY,
          type: "image",
          displayName: "Image",
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

  QuestionFactory.Instance.registerQuestion(
    DRAG_CATEGORIZE_TYPE,
    (name: string) => new DragCategorizeQuestion(name),
  );
}
