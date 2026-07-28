import { ChoiceItem, ItemValue } from "survey-core";
import {
  ALLOW_MULTIPLE_ZONES_PROPERTY,
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_ZONE_CLASS,
  IMAGE_URL_PROPERTY,
  MAX_ITEMS_PROPERTY,
  MIN_ITEMS_PROPERTY,
} from "./constants";

/**
 * Draggable item: standard choice item plus an optional image and the
 * clone-instead-of-move flag.
 */
export class DragCategorizeItemValue extends ChoiceItem {
  protected getBaseType(): string {
    return DRAG_CATEGORIZE_ITEM_CLASS;
  }

  public get imageUrl(): string {
    return this.getPropertyValue(IMAGE_URL_PROPERTY);
  }
  public set imageUrl(val: string) {
    this.setPropertyValue(IMAGE_URL_PROPERTY, val);
  }

  public get allowMultipleZones(): boolean {
    return this.getPropertyValue(ALLOW_MULTIPLE_ZONES_PROPERTY) === true;
  }
  public set allowMultipleZones(val: boolean) {
    this.setPropertyValue(ALLOW_MULTIPLE_ZONES_PROPERTY, val);
  }
}

/**
 * Drop zone: reuses ItemValue's `value` + localizable `text` (the zone
 * title) and adds min/max capacity constraints.
 */
export class DragCategorizeZoneItemValue extends ItemValue {
  constructor(value: unknown, text?: string) {
    super(value, text, DRAG_CATEGORIZE_ZONE_CLASS);
  }

  protected getBaseType(): string {
    return DRAG_CATEGORIZE_ZONE_CLASS;
  }

  public get minItems(): number {
    return this.getPropertyValue(MIN_ITEMS_PROPERTY) ?? 0;
  }
  public set minItems(val: number) {
    this.setPropertyValue(MIN_ITEMS_PROPERTY, val);
  }

  public get maxItems(): number {
    return this.getPropertyValue(MAX_ITEMS_PROPERTY) ?? 0;
  }
  public set maxItems(val: number) {
    this.setPropertyValue(MAX_ITEMS_PROPERTY, val);
  }
}
