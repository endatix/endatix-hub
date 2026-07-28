import {
  DragOrClickHelper,
  ItemValue,
  QuestionSelectBase,
  SurveyError,
} from "survey-core";
import {
  DEFAULT_ZONE_MIN_WIDTH,
  DRAG_CATEGORIZE_ITEM_CLASS,
  DRAG_CATEGORIZE_TYPE,
  POOL_ZONE_ID,
  REQUIRE_ALL_ITEMS_PROPERTY,
  SHOW_ITEM_LABELS_PROPERTY,
  ZONE_MIN_WIDTH_PROPERTY,
  ZONES_PROPERTY,
} from "./constants";
import type { DragCategorizePlacement } from "./types";
import { validateZoneConstraints } from "./drag-categorize.validation";
import {
  isItemPlaced,
  isPlacementEmpty,
  parsePlacement,
  placeItem,
  reconcilePlacement,
} from "./utils";
import type { PlacementByItem } from "./utils";
import { DragDropCategorize } from "./drag-categorize.drag-controller";
import type {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./drag-categorize.item-values";

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
  private invisibleOldPlacementValue: PlacementByItem | undefined;
  private isChangingValueOnClearIncorrect = false;

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

  /**
   * Whether items with an image also show their label underneath. Only
   * applies to items whose label the scripter actually authored — see
   * hasExplicitLabel. Turn off for purely visual sorting tasks.
   */
  public get showItemLabels(): boolean {
    return this.getPropertyValue(SHOW_ITEM_LABELS_PROPERTY) !== false;
  }
  public set showItemLabels(val: boolean) {
    this.setPropertyValue(SHOW_ITEM_LABELS_PROPERTY, val);
  }

  /**
   * Minimum zone width in pixels. Zones share each row equally and wrap
   * when they would get narrower than this — so it also controls how many
   * zones fit per row.
   */
  public get zoneMinWidth(): number {
    const value = this.getPropertyValue(ZONE_MIN_WIDTH_PROPERTY);
    return typeof value === "number" && value > 0
      ? value
      : DEFAULT_ZONE_MIN_WIDTH;
  }
  public set zoneMinWidth(val: number) {
    this.setPropertyValue(ZONE_MIN_WIDTH_PROPERTY, val);
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
    // Consumed here, so a later drag can never inherit this one's origin.
    const fromZoneId =
      this.draggedFromZoneIdValue === POOL_ZONE_ID
        ? undefined
        : this.draggedFromZoneIdValue;
    this.draggedFromZoneIdValue = undefined;
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
   * Placements dropped because their item stopped being visible, keyed by
   * item value. Survives only until the respondent changes the answer
   * themselves — the same lifecycle survey-core gives checkbox's
   * invisibleOldValues.
   */
  private get invisibleOldPlacement(): PlacementByItem {
    return (this.invisibleOldPlacementValue ??= {});
  }

  /**
   * Zones to put back for stashed items that are visible again. Consumes the
   * entries it returns, so a restore never happens twice.
   */
  private takeRestorablePlacement(): PlacementByItem {
    const stash = this.invisibleOldPlacementValue;
    if (!stash) return {};
    const restore: PlacementByItem = {};
    for (const item of this.categorizeItems) {
      const itemValue = String(item.value);
      const zones = stash[itemValue];
      if (!zones) continue;
      restore[itemValue] = zones;
      delete stash[itemValue];
    }
    return restore;
  }

  /**
   * The inherited select-base implementation treats any object value as
   * "unknown" and clears it wholesale; instead keep known zones/items and
   * drop the rest.
   *
   * Items hidden by visibleIf / choicesVisibleIf are dropped from the value
   * but remembered, so unhiding them restores where they were rather than
   * silently destroying the answer. This runs on every navigation — SurveyJS
   * calls it from runItemsCondition the moment a condition flips — so
   * permanent stripping here loses respondent data mid-form.
   */
  protected clearIncorrectValuesCore(): void {
    const { placement, removed, changed } = reconcilePlacement({
      placement: this.placement,
      zoneIds: this.zones.map((zone) => String(zone.value)),
      visibleItemValues: this.categorizeItems.map((item) =>
        String(item.value),
      ),
      multiZoneItemValues: this.categorizeItems
        .filter((item) => item.allowMultipleZones)
        .map((item) => String(item.value)),
      restore: this.takeRestorablePlacement(),
    });

    for (const [itemValue, zones] of Object.entries(removed)) {
      this.invisibleOldPlacement[itemValue] = zones;
    }
    if (!changed) return;

    const next = compactPlacement(placement);
    // Writing the value would normally discard the stash — see setNewValue.
    this.isChangingValueOnClearIncorrect = true;
    try {
      if (isPlacementEmpty(next)) {
        this.clearValue(true);
      } else {
        this.value = next;
      }
    } finally {
      this.isChangingValueOnClearIncorrect = false;
    }
  }

  /**
   * Without this the base bails out as soon as the value is empty, and an
   * item whose placement was the only answer could never be restored.
   */
  protected hasValueToClearIncorrectValues(): boolean {
    return (
      super.hasValueToClearIncorrectValues() ||
      Object.keys(this.invisibleOldPlacementValue ?? {}).length > 0
    );
  }

  /** A respondent-driven answer change supersedes anything stashed. */
  protected setNewValue(newValue: unknown): void {
    if (!this.isChangingValueOnClearIncorrect) {
      this.invisibleOldPlacementValue = undefined;
    }
    super.setNewValue(newValue);
  }

  public updateValueFromSurvey(newValue: unknown, clearData: boolean): void {
    super.updateValueFromSurvey(newValue, clearData);
    this.invisibleOldPlacementValue = undefined;
  }

  // --- Display value and plain data ---

  /** The item's authored label, falling back to its value. */
  private getItemDisplayText(itemValue: string): string {
    return (
      ItemValue.getTextOrHtmlByValue(this.visibleChoices, itemValue) ||
      itemValue
    );
  }

  /**
   * Zones that carry an answer, in definition order — the value's own key
   * order is an artifact of which zone the respondent filled first.
   */
  private getAnsweredZones(
    placement: DragCategorizePlacement,
  ): DragCategorizeZoneItemValue[] {
    return this.zones.filter(
      (zone) => (placement[String(zone.value)] ?? []).length > 0,
    );
  }

  /**
   * Readable rendering of the placement: "Zone A: Item 1, Item 2; Zone B: …".
   *
   * A string rather than the keyed object that Matrix and Multiple Text
   * return, because piping resolves `{q1}` through this method — those
   * question types render as "[object Object]" in piped text, and there is no
   * separate hook to fix that (both the displayValue getter and the text
   * preprocessor call getDisplayValue(true)). A string also matches our own
   * base class: QuestionSelectBase joins multi-value answers into text.
   * Structured consumers get per-zone entries from getPlainData instead.
   *
   * keysAsText is ignored: zone ids in place of titles would be unreadable in
   * every context this feeds.
   */
  protected getDisplayValueCore(
    _keysAsText: boolean,
    value: unknown,
  ): string {
    const placement = parsePlacement(value);
    return this.getAnsweredZones(placement)
      .map((zone) => {
        const zoneId = String(zone.value);
        const items = placement[zoneId]
          .map((itemValue) => this.getItemDisplayText(itemValue))
          .join(", ");
        return `${zone.text || zoneId}: ${items}`;
      })
      .join("; ");
  }

  /**
   * One child node per zone, mirroring how Matrix exposes a row per row.
   *
   * The inherited select-base implementation wraps the whole placement object
   * in a single "Choice option" node, which is meaningless for a value that is
   * not a choice reference.
   */
  public getPlainData(
    options: Parameters<QuestionSelectBase["getPlainData"]>[0] = {
      includeEmpty: true,
    },
  ): ReturnType<QuestionSelectBase["getPlainData"]> {
    const plainData = super.getPlainData(options);
    if (!plainData) return plainData;

    const placement = this.placement;
    const zones = options?.includeEmpty
      ? this.zones
      : this.getAnsweredZones(placement);

    plainData.isNode = true;
    plainData.data = [
      // Keep the comment node the base class contributes; drop the choice
      // nodes select-base added on top of it.
      ...(plainData.data ?? []).filter((item) => item.isComment),
      ...zones.map((zone) => {
        const zoneId = String(zone.value);
        const items = placement[zoneId] ?? [];
        return {
          name: zoneId,
          title: zone.text || zoneId,
          value: items,
          displayValue: items.map((itemValue) =>
            this.getItemDisplayText(itemValue),
          ),
          isNode: false,
          getString: (val: unknown) => this.getValueAsString(val),
        };
      }),
    ];
    return plainData;
  }

  public get rootClass(): string {
    const classes = ["sv-categorize"];
    if (this.isReadOnly) classes.push("sv-categorize--readonly");
    if (this.isDesignMode) classes.push("sv-categorize--design");
    return classes.join(" ");
  }
}
