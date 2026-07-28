import {
  DragOrClickHelper,
  ItemValue,
  QuestionSelectBase,
  SurveyError,
} from "survey-core";
import {
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  POOL_ZONE_ID,
  REQUIRE_ALL_ITEMS_PROPERTY,
  ZONES_PROPERTY,
} from "../constants";
import type { DragCategorizePlacement } from "../types";
import { validateZoneConstraints } from "../use-cases/validate-zones";
import {
  isItemPlaced,
  isPlacementEmpty,
  parsePlacement,
  placeItem,
  sanitizePlacement,
} from "../utils";
import { DragDropCategorize } from "./drag-drop-controller";
import type {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./item-values";

const HOVERED_ZONE_PROPERTY = "hoveredZoneId";

function compactPlacement(
  placement: DragCategorizePlacement,
): DragCategorizePlacement {
  const next: DragCategorizePlacement = {};
  for (const [zoneId, items] of Object.entries(placement)) {
    if (items.length > 0) next[zoneId] = items;
  }
  return next;
}

/**
 * Drag-categorize question: respondents drag items (text or images) from a
 * pool into named category zones. Value shape: Record<zoneId, itemValue[]>.
 *
 * The question value is the single source of truth for placement — the
 * drag-drop controller commits changes through dropItem, and the React
 * renderer derives pool/zone contents from the value on every render.
 */
export class DragCategorizeQuestion extends QuestionSelectBase {
  public dragDropCategorize!: DragDropCategorize;
  private dragOrClickHelper: DragOrClickHelper;
  private draggedChoiceValue: string | undefined;
  private draggedFromZoneIdValue: string | undefined;
  private draggedTargetNode: HTMLElement | undefined;

  // --- Compatibility members touched by the inherited DragDropRankingChoices
  // engine (doBanDropHere / clear / ghostPositionChanged). Rendering reacts to
  // value + hoveredZoneId changes instead, so these are inert.
  public dropTargetNodeMove: string | null = null;
  public currentDropTarget: ItemValue | null = null;
  public updateRankingChoices(_forceUpdate?: boolean): void {}

  constructor(name: string) {
    super(name);
    this.createItemValues(ZONES_PROPERTY);
    this.dragOrClickHelper = new DragOrClickHelper(this.startDrag);
  }

  public getType(): string {
    return DRAG_CATEGORIZE_TYPE;
  }

  protected getItemValueType(): string {
    return DRAG_CATEGORIZE_ITEM_CLASS;
  }

  public get zones(): DragCategorizeZoneItemValue[] {
    return this.getPropertyValue(ZONES_PROPERTY);
  }
  public set zones(val: DragCategorizeZoneItemValue[]) {
    this.setPropertyValue(ZONES_PROPERTY, val);
  }

  public get requireAllItems(): boolean {
    return this.getPropertyValue(REQUIRE_ALL_ITEMS_PROPERTY) === true;
  }
  public set requireAllItems(val: boolean) {
    this.setPropertyValue(REQUIRE_ALL_ITEMS_PROPERTY, val);
  }

  /** Zone currently hovered during a drag; drives the drop-target highlight. */
  public get hoveredZoneId(): string | undefined {
    return this.getPropertyValue(HOVERED_ZONE_PROPERTY);
  }
  public set hoveredZoneId(val: string | undefined) {
    this.setPropertyValue(HOVERED_ZONE_PROPERTY, val);
  }

  /** Current value normalized into a safe zoneId → itemValue[] record. */
  public get placement(): DragCategorizePlacement {
    return parsePlacement(this.value);
  }

  /**
   * Items shown in the pool: clone items always stay available; move items
   * appear until they are placed in a zone.
   */
  public get pool(): DragCategorizeItemValue[] {
    const placement = this.placement;
    return this.categorizeItems.filter(
      (item) =>
        item.allowMultipleZones ||
        !isItemPlaced(placement, String(item.value)),
    );
  }

  private get categorizeItems(): DragCategorizeItemValue[] {
    return this.visibleChoices as DragCategorizeItemValue[];
  }

  public hasZone(zoneId: string): boolean {
    return (
      zoneId === POOL_ZONE_ID ||
      this.zones.some((zone) => String(zone.value) === zoneId)
    );
  }

  public getZone(zoneId: string): DragCategorizeZoneItemValue | undefined {
    return this.zones.find((zone) => String(zone.value) === zoneId);
  }

  public getZoneItems(zoneId: string): DragCategorizeItemValue[] {
    if (zoneId === POOL_ZONE_ID) return this.pool;
    const placed = this.placement[zoneId] ?? [];
    const items = this.categorizeItems;
    return placed
      .map((value) => items.find((item) => String(item.value) === value))
      .filter((item): item is DragCategorizeItemValue => Boolean(item));
  }

  /** Capacity check used by the drag controller to ban over-full drops. */
  public canDropItemIntoZone(item: ItemValue, zoneId: string): boolean {
    if (zoneId === POOL_ZONE_ID) return true;
    const zone = this.getZone(zoneId);
    if (!zone) return false;
    const zoneValues = this.placement[zoneId] ?? [];
    if (zoneValues.includes(String(item.value))) return true;
    return !zone.maxItems || zoneValues.length < zone.maxItems;
  }

  /** Commits a completed drag: move or clone the item into the target zone. */
  public dropItem(item: ItemValue, targetZoneId: string): void {
    const itemValue = String(item.value);
    const clone =
      (item as DragCategorizeItemValue).allowMultipleZones === true;
    const fromZoneId =
      this.draggedFromZoneIdValue === POOL_ZONE_ID
        ? undefined
        : this.draggedFromZoneIdValue;
    const toZoneId = targetZoneId === POOL_ZONE_ID ? undefined : targetZoneId;

    if (toZoneId && !this.hasZone(toZoneId)) return;

    const next = compactPlacement(
      placeItem({
        placement: this.placement,
        itemValue,
        fromZoneId,
        toZoneId,
        clone,
      }),
    );

    this.value = isPlacementEmpty(next) ? undefined : next;
  }

  /**
   * Design-time add: SurveyJS appends a ghost "newitem" placeholder to
   * visibleChoices in design mode, but the Creator adorner that makes it
   * clickable only attaches to built-in renderers — so clicking our ghost
   * chip adds the choice directly (the Creator's undo engine tracks the
   * array change). Value naming follows the Creator's item1..itemN scheme.
   */
  public addItemFromDesigner(): void {
    if (!this.isDesignMode) return;
    const values = new Set(this.choices.map((item) => String(item.value)));
    let index = this.choices.length + 1;
    while (values.has(`item${index}`)) index++;
    this.choices.push(this.createItemValue(`item${index}`));
  }

  // --- Drag wiring (same DragOrClickHelper pattern as QuestionRankingModel) ---

  public handlePointerDown = (
    event: PointerEvent,
    item: ItemValue,
    zoneId: string,
    node: HTMLElement,
  ): void => {
    if (this.isReadOnly || this.isDesignMode || !this.dragDropCategorize) {
      return;
    }
    this.draggedChoiceValue = String(item.value);
    this.draggedFromZoneIdValue = zoneId;
    this.draggedTargetNode = node;
    this.dragOrClickHelper.onPointerDown(event);
  };

  public startDrag = (event: PointerEvent): void => {
    const item = ItemValue.getItemByValue(
      this.visibleChoices,
      this.draggedChoiceValue,
    );
    if (!item || !this.draggedTargetNode) return;
    this.dragDropCategorize.startDrag(
      event,
      item,
      this,
      this.draggedTargetNode,
    );
  };

  public setSurveyImpl(
    value: Parameters<QuestionSelectBase["setSurveyImpl"]>[0],
    isLight?: boolean,
  ): void {
    super.setSurveyImpl(value, isLight);
    this.setDragDropCategorize();
  }

  public endLoadingFromJson(): void {
    super.endLoadingFromJson();
    this.setDragDropCategorize();
  }

  private setDragDropCategorize(): void {
    this.dragDropCategorize = this.createDragDropCategorize();
  }

  protected createDragDropCategorize(): DragDropCategorize {
    return new DragDropCategorize(this.survey, null, true);
  }

  // --- Validation and value hygiene ---

  protected onCheckForErrors(
    errors: SurveyError[],
    isOnValueChanged: boolean,
    fireCallback: boolean,
  ): void {
    super.onCheckForErrors(errors, isOnValueChanged, fireCallback);
    if (this.isEmpty() && !this.requireAllItems) return;
    validateZoneConstraints({
      requireAllItems: this.requireAllItems,
      placement: this.placement,
      items: this.categorizeItems.map((item) => ({
        value: String(item.value),
      })),
      zones: this.zones.map((zone) => ({
        value: String(zone.value),
        text: zone.text,
        minItems: zone.minItems,
        maxItems: zone.maxItems,
      })),
      errorOwner: this,
    }).forEach((error) => errors.push(error));
  }

  /**
   * The inherited select-base implementation treats any object value as
   * "unknown" and clears it wholesale; instead keep known zones/items and
   * drop the rest.
   */
  protected clearIncorrectValuesCore(): void {
    const placement = this.placement;
    const sanitized = sanitizePlacement(
      placement,
      this.zones.map((zone) => String(zone.value)),
      this.categorizeItems.map((item) => String(item.value)),
    );
    if (sanitized === placement) return;
    const next = compactPlacement(sanitized);
    if (isPlacementEmpty(next)) {
      this.clearValue(true);
    } else {
      this.value = next;
    }
  }

  public get rootClass(): string {
    const classes = ["sv-categorize"];
    if (this.isReadOnly) classes.push("sv-categorize--readonly");
    if (this.isDesignMode) classes.push("sv-categorize--design");
    return classes.join(" ");
  }
}
