import { beforeAll, describe, expect, it } from "vitest";
import { DragDropCategorize } from "../infrastructure/drag-drop-controller";
import { registerDragCategorizeGlobals } from "../infrastructure/registry";

interface ShortcutFactory {
  createDraggedElementShortcut(
    text: string,
    draggedElementNode: HTMLElement,
    event: PointerEvent,
  ): HTMLElement & { shortcutXOffset?: number; shortcutYOffset?: number };
}

describe("DragDropCategorize.createDraggedElementShortcut", () => {
  beforeAll(() => {
    registerDragCategorizeGlobals();
  });

  it("wraps a chip clone in a bare positioned container without ranking pill classes", () => {
    // Arrange
    const controller = new DragDropCategorize(
      undefined,
      null,
      true,
    ) as unknown as ShortcutFactory;
    const chip = document.createElement("div");
    chip.className = "sv-ranking-item sv-categorize__item";
    chip.textContent = "item5";
    document.body.appendChild(chip);
    const event = { clientX: 10, clientY: 20 } as PointerEvent;

    // Act
    const shortcut = controller.createDraggedElementShortcut(
      "item5",
      chip,
      event,
    );

    // Assert
    expect(shortcut.className).toBe("sv-categorize-shortcut");
    expect(shortcut.className).not.toContain("sv-ranking-shortcut");
    expect(
      shortcut.querySelector(".sv-categorize__item")?.textContent,
    ).toBe("item5");
    expect(typeof shortcut.shortcutXOffset).toBe("number");
    expect(typeof shortcut.shortcutYOffset).toBe("number");

    chip.remove();
  });
});
