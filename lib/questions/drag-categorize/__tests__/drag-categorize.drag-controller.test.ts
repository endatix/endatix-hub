import { ItemValue, Model } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { POOL_ZONE_ID } from "../constants";
import { DragDropCategorize } from "../drag-categorize.drag-controller";
import type { DragCategorizeQuestion } from "../drag-categorize.model";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

interface ShortcutFactory {
  createDraggedElementShortcut(
    text: string,
    draggedElementNode: HTMLElement,
    event: PointerEvent,
  ): HTMLElement & { shortcutXOffset?: number; shortcutYOffset?: number };
}

/**
 * The engine's contract with the question runs through protected members, so
 * the drag path can only be driven by reaching past the public surface.
 */
interface ControllerInternals {
  parentElement: unknown;
  draggedElement: unknown;
  dropTarget: unknown;
  findDropTargetNodeByDragOverNode(node: HTMLElement): HTMLElement | null;
  getDropTargetByNode(node: HTMLElement, event: PointerEvent): unknown;
  isDropTargetValid(dropTarget: unknown): boolean;
  afterDragOver(node: HTMLElement): void;
  doBanDropHere: () => void;
  doDrop(): unknown;
  clear(): void;
}

const surveyJson = {
  pages: [
    {
      elements: [
        {
          type: "dragcategorize",
          name: "q1",
          choices: [
            { value: "item_1" },
            { value: "item_2" },
            { value: "item_3" },
          ],
          zones: [
            { value: "zone_a" },
            { value: "zone_b", maxItems: 2 },
          ],
        },
      ],
    },
  ],
};

function createHarness(): {
  question: DragCategorizeQuestion;
  controller: ControllerInternals;
} {
  const model = new Model(surveyJson);
  const question = model.getQuestionByName(
    "q1",
  ) as unknown as DragCategorizeQuestion;
  const controller = new DragDropCategorize(
    undefined,
    null,
    true,
  ) as unknown as ControllerInternals;
  controller.parentElement = question;
  return { question, controller };
}

function getItem(question: DragCategorizeQuestion, value: string): ItemValue {
  const item = question.visibleChoices.find((c) => c.value === value);
  if (!item) throw new Error(`item ${value} not found`);
  return item;
}

/** A zone element with a chip inside it, as the runner renders them. */
function renderZone(zoneId: string): { zone: HTMLElement; chip: HTMLElement } {
  const zone = document.createElement("div");
  zone.dataset.categorize = zoneId;
  const chip = document.createElement("div");
  chip.className = "sv-categorize__item";
  const label = document.createElement("span");
  chip.appendChild(label);
  zone.appendChild(chip);
  document.body.appendChild(zone);
  return { zone, chip };
}

describe("DragDropCategorize.createDraggedElementShortcut", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
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

  it("pins the clone to the source chip's laid-out width", () => {
    // Arrange
    const controller = new DragDropCategorize(
      undefined,
      null,
      true,
    ) as unknown as ShortcutFactory;
    const chip = document.createElement("div");
    chip.className = "sv-categorize__item";
    chip.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 220, height: 40 }) as DOMRect;
    const event = { clientX: 10, clientY: 20 } as PointerEvent;

    // Act
    const shortcut = controller.createDraggedElementShortcut("", chip, event);
    const clone = shortcut.querySelector<HTMLElement>(".sv-categorize__item");

    // Assert
    expect(clone?.style.width).toBe("220px");
    expect(clone?.style.boxSizing).toBe("border-box");
  });
});

describe("DragDropCategorize drop targeting", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  describe("resolving the drop target from the DOM", () => {
    it("uses the dragged-over node when it is a zone itself", () => {
      // Arrange
      const { controller } = createHarness();
      const { zone } = renderZone("zone_a");

      // Act
      const node = controller.findDropTargetNodeByDragOverNode(zone);

      // Assert
      expect(node).toBe(zone);
      zone.remove();
    });

    it("walks up to the enclosing zone when dragging over a chip", () => {
      // Arrange — chips fill the zone, so most drag-over events land on them
      const { controller } = createHarness();
      const { zone, chip } = renderZone("zone_a");

      // Act
      const node = controller.findDropTargetNodeByDragOverNode(
        chip.firstElementChild as HTMLElement,
      );

      // Assert
      expect(node).toBe(zone);
      zone.remove();
    });

    it("resolves nothing outside any zone, which the engine reads as a ban", () => {
      // Arrange
      const { controller } = createHarness();
      const outside = document.createElement("div");
      document.body.appendChild(outside);

      // Act
      const node = controller.findDropTargetNodeByDragOverNode(outside);

      // Assert
      expect(node).toBeNull();
      outside.remove();
    });

    it("reads the zone id off the resolved node", () => {
      // Arrange
      const { controller } = createHarness();
      const { zone } = renderZone("zone_b");

      // Act
      const target = controller.getDropTargetByNode(zone, {} as PointerEvent);

      // Assert
      expect(target).toBe("zone_b");
      zone.remove();
    });
  });

  describe("validating the drop target", () => {
    it("accepts a known zone", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");

      // Act & Assert
      expect(controller.isDropTargetValid("zone_a")).toBe(true);
    });

    it("accepts the pool", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");

      // Act & Assert
      expect(controller.isDropTargetValid(POOL_ZONE_ID)).toBe(true);
    });

    it("rejects a zone that is not in the definition", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");

      // Act & Assert
      expect(controller.isDropTargetValid("zone_ghost")).toBe(false);
    });

    it("rejects a target that is not a zone id at all", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");

      // Act & Assert
      expect(controller.isDropTargetValid(undefined)).toBe(false);
      expect(controller.isDropTargetValid(42)).toBe(false);
    });

    it("bans a drop into a zone that is already at maxItems", () => {
      // Arrange
      const { question, controller } = createHarness();
      question.value = { zone_b: ["item_1", "item_2"] };
      controller.draggedElement = getItem(question, "item_3");

      // Act & Assert
      expect(controller.isDropTargetValid("zone_b")).toBe(false);
    });

    it("allows re-dropping an item into the full zone it already occupies", () => {
      // Arrange — otherwise picking a chip up and putting it back is banned
      const { question, controller } = createHarness();
      question.value = { zone_b: ["item_1", "item_2"] };
      controller.draggedElement = getItem(question, "item_1");

      // Act & Assert
      expect(controller.isDropTargetValid("zone_b")).toBe(true);
    });
  });

  describe("hover highlighting", () => {
    it("marks the hovered zone while dragging over it", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.dropTarget = "zone_a";

      // Act
      controller.afterDragOver(document.createElement("div"));

      // Assert
      expect(question.hoveredZoneId).toBe("zone_a");
    });

    it("clears the highlight when the target is not a zone", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.dropTarget = undefined;

      // Act
      controller.afterDragOver(document.createElement("div"));

      // Assert
      expect(question.hoveredZoneId).toBeUndefined();
    });

    it("clears the highlight on a banned drop", () => {
      // Arrange
      const { question, controller } = createHarness();
      question.hoveredZoneId = "zone_a";

      // Act
      controller.doBanDropHere();

      // Assert
      expect(question.hoveredZoneId).toBeUndefined();
    });

    it("clears the highlight when the drag ends", () => {
      // Arrange
      const { question, controller } = createHarness();
      question.hoveredZoneId = "zone_a";

      // Act
      controller.clear();

      // Assert
      expect(question.hoveredZoneId).toBeUndefined();
    });
  });

  describe("committing the drop", () => {
    it("places the dragged item into the resolved zone", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");
      controller.dropTarget = "zone_a";

      // Act
      controller.doDrop();

      // Assert
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });

    it("returns the item to the pool when dropped there", () => {
      // Arrange
      const { question, controller } = createHarness();
      question.value = { zone_a: ["item_1"] };
      controller.draggedElement = getItem(question, "item_1");
      controller.dropTarget = POOL_ZONE_ID;

      // Act
      controller.doDrop();

      // Assert
      expect(question.isEmpty()).toBe(true);
    });

    it("leaves the value alone when no zone was resolved", () => {
      // Arrange
      const { question, controller } = createHarness();
      question.value = { zone_a: ["item_1"] };
      controller.draggedElement = getItem(question, "item_2");
      controller.dropTarget = undefined;

      // Act
      controller.doDrop();

      // Assert
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });

    it("hands the question back to the engine as the drop result", () => {
      // Arrange
      const { question, controller } = createHarness();
      controller.draggedElement = getItem(question, "item_1");
      controller.dropTarget = "zone_a";

      // Act & Assert
      expect(controller.doDrop()).toBe(question);
    });
  });
});
