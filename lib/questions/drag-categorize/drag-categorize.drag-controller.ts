import { DragDropRankingSelectToRank } from "survey-core";
import type { DragCategorizeQuestion } from "./drag-categorize-question.model";

/**
 * N-zone drag controller. Extends the SurveyJS select-to-rank engine to keep
 * its DOM adapter behavior (mobile long-tap, scroll-while-dragging, floating
 * shortcut) while replacing the two-container logic with zone-id targets.
 *
 * Drop targets are always whole zones — categorization is unordered, so
 * there is no positional insert between items. `dropTarget` is the zone id
 * string read from the `data-categorize` attribute; the drop itself is
 * committed in doDrop via the question model, never during drag-over (which
 * would re-clone allowMultipleZones items on every hover).
 */
export class DragDropCategorize extends DragDropRankingSelectToRank {
  private get question(): DragCategorizeQuestion {
    return this.parentElement as unknown as DragCategorizeQuestion;
  }

  /**
   * The inherited ranking shortcut wraps the clone in a themed
   * `.sv-ranking-shortcut` container (pill-shaped: 100px border-radius,
   * min-width, shadow) that shows around the chip. Use a bare positioned
   * container instead — the cloned chip carries its own styling.
   */
  protected createDraggedElementShortcut(
    _text: string,
    draggedElementNode: HTMLElement,
    event: PointerEvent,
  ): HTMLElement {
    const shortcut = document.createElement("div") as HTMLElement & {
      shortcutXOffset?: number;
      shortcutYOffset?: number;
    };
    shortcut.className = "sv-categorize-shortcut";
    shortcut.appendChild(draggedElementNode.cloneNode(true));
    const rect = draggedElementNode.getBoundingClientRect();
    shortcut.shortcutXOffset = event.clientX - rect.x;
    shortcut.shortcutYOffset = event.clientY - rect.y;
    return shortcut;
  }

  protected findDropTargetNodeByDragOverNode(
    dragOverNode: HTMLElement,
  ): HTMLElement {
    if (dragOverNode.dataset?.categorize) return dragOverNode;
    // The engine treats a null return as "ban drop here".
    return dragOverNode.closest<HTMLElement>(
      "[data-categorize]",
    ) as HTMLElement;
  }

  protected getDropTargetByNode(
    dropTargetNode: HTMLElement,
    _event: PointerEvent,
  ): unknown {
    return dropTargetNode.dataset.categorize;
  }

  protected isDropTargetValid(dropTarget: unknown): boolean {
    if (typeof dropTarget !== "string" || !this.question) return false;
    if (!this.question.hasZone(dropTarget)) return false;
    return this.question.canDropItemIntoZone(this.draggedElement, dropTarget);
  }

  protected calculateIsBottom(): boolean {
    return false;
  }

  protected afterDragOver(_dropTargetNode: HTMLElement): void {
    this.question.hoveredZoneId =
      typeof this.dropTarget === "string" ? this.dropTarget : undefined;
  }

  protected doDragOver = (): void => {
    this.setShortcutCursor("grabbing");
  };

  protected doBanDropHere = (): void => {
    if (this.question) this.question.hoveredZoneId = undefined;
    this.setShortcutCursor("not-allowed");
  };

  protected doDrop(): unknown {
    if (typeof this.dropTarget === "string") {
      this.question.dropItem(this.draggedElement, this.dropTarget);
    }
    return this.parentElement;
  }

  public clear(): void {
    if (this.parentElement) {
      this.question.hoveredZoneId = undefined;
    }
    super.clear();
  }

  private setShortcutCursor(cursor: string): void {
    const node =
      this.domAdapter?.draggedElementShortcut?.querySelector<HTMLElement>(
        ".sv-ranking-item",
      );
    if (node) node.style.cursor = cursor;
  }
}
