import { Model } from "survey-core";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE, POOL_ZONE_ID } from "../constants";
import type { DragCategorizeQuestion } from "../infrastructure/drag-categorize-question.model";
import { registerDragCategorizeGlobals } from "../infrastructure/registry";

const surveyJson = {
  pages: [
    {
      elements: [
        {
          type: DRAG_CATEGORIZE_TYPE,
          name: "q1",
          choices: [
            { value: "item_1", text: "Item 1" },
            { value: "item_2", text: "Item 2", imageUrl: "https://x/2.png" },
            { value: "item_3", text: "Item 3", allowMultipleZones: true },
          ],
          zones: [
            { value: "zone_a", text: "Zone A" },
            { value: "zone_b", text: "Zone B", minItems: 0, maxItems: 2 },
          ],
        },
      ],
    },
  ],
};

function createQuestion(): { model: Model; question: DragCategorizeQuestion } {
  const model = new Model(surveyJson);
  const question = model.getQuestionByName(
    "q1",
  ) as unknown as DragCategorizeQuestion;
  return { model, question };
}

function getItem(question: DragCategorizeQuestion, value: string) {
  const item = question.visibleChoices.find((c) => c.value === value);
  if (!item) throw new Error(`item ${value} not found`);
  return item;
}

describe("DragCategorizeQuestion", () => {
  beforeAll(() => {
    registerDragCategorizeGlobals();
  });

  describe("deserialization", () => {
    it("loads zones and custom item properties from JSON", () => {
      // Act
      const { question } = createQuestion();

      // Assert
      expect(question.zones).toHaveLength(2);
      expect(question.zones[1].maxItems).toBe(2);
      expect(question.zones[0].text).toBe("Zone A");
      const item2 = getItem(question, "item_2") as never as {
        imageUrl: string;
      };
      const item3 = getItem(question, "item_3") as never as {
        allowMultipleZones: boolean;
      };
      expect(item2.imageUrl).toBe("https://x/2.png");
      expect(item3.allowMultipleZones).toBe(true);
    });

    it("serializes zones back to JSON", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      const json = question.toJSON();

      // Assert
      expect(json.zones).toEqual([
        { value: "zone_a", text: "Zone A" },
        { value: "zone_b", text: "Zone B", maxItems: 2 },
      ]);
    });
  });

  describe("pool and zone contents", () => {
    it("shows all items in the pool when nothing is placed", () => {
      // Act
      const { question } = createQuestion();

      // Assert
      expect(question.pool.map((i) => i.value)).toEqual([
        "item_1",
        "item_2",
        "item_3",
      ]);
    });

    it("removes moved items from the pool but keeps clone items", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.value = { zone_a: ["item_1", "item_3"] };

      // Assert
      expect(question.pool.map((i) => i.value)).toEqual(["item_2", "item_3"]);
      expect(question.getZoneItems("zone_a").map((i) => i.value)).toEqual([
        "item_1",
        "item_3",
      ]);
    });
  });

  describe("dropItem", () => {
    it("moves a pool item into a zone", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.dropItem(getItem(question, "item_1"), "zone_a");

      // Assert
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });

    it("moves an item between zones", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"] };
      simulateDragFrom(question, "item_1", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_1"), "zone_b");

      // Assert
      expect(question.value).toEqual({ zone_b: ["item_1"] });
    });

    it("clones an allowMultipleZones item into several zones", () => {
      // Arrange
      const { question } = createQuestion();
      const cloneItem = getItem(question, "item_3");

      // Act
      simulateDragFrom(question, "item_3", POOL_ZONE_ID);
      question.dropItem(cloneItem, "zone_a");
      simulateDragFrom(question, "item_3", POOL_ZONE_ID);
      question.dropItem(cloneItem, "zone_b");

      // Assert
      expect(question.value).toEqual({
        zone_a: ["item_3"],
        zone_b: ["item_3"],
      });
      expect(question.pool.map((i) => i.value)).toContain("item_3");
    });

    it("returns an item to the pool and clears an empty value", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"] };
      simulateDragFrom(question, "item_1", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_1"), POOL_ZONE_ID);

      // Assert
      expect(question.isEmpty()).toBe(true);
    });

    it("ignores drops into unknown zones", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.dropItem(getItem(question, "item_1"), "zone_ghost");

      // Assert
      expect(question.isEmpty()).toBe(true);
    });
  });

  describe("canDropItemIntoZone", () => {
    it("bans drops into a full zone but allows the pool", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_b: ["item_1", "item_2"] };

      // Act & Assert
      expect(
        question.canDropItemIntoZone(getItem(question, "item_3"), "zone_b"),
      ).toBe(false);
      expect(
        question.canDropItemIntoZone(getItem(question, "item_3"), "zone_a"),
      ).toBe(true);
      expect(
        question.canDropItemIntoZone(getItem(question, "item_1"), POOL_ZONE_ID),
      ).toBe(true);
    });
  });

  describe("validation", () => {
    it("fails when requireAllItems is on and items remain in the pool", () => {
      // Arrange
      const { question } = createQuestion();
      question.requireAllItems = true;
      question.value = { zone_a: ["item_1"] };

      // Act
      const hasErrors = question.hasErrors();

      // Assert
      expect(hasErrors).toBe(true);
      expect(question.errors[0].getText()).toContain("place all items");
    });

    it("fails when a zone exceeds maxItems", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_b: ["item_1", "item_2", "item_3"] };

      // Act & Assert
      expect(question.hasErrors()).toBe(true);
      expect(question.errors[0].getText()).toContain("at most 2");
    });

    it("passes when constraints are satisfied", () => {
      // Arrange
      const { question } = createQuestion();
      question.requireAllItems = true;
      question.value = {
        zone_a: ["item_1", "item_3"],
        zone_b: ["item_2"],
      };

      // Act & Assert
      expect(question.hasErrors()).toBe(false);
    });
  });

  describe("value hygiene", () => {
    it("keeps a valid object value through survey validation", () => {
      // Arrange
      const { model, question } = createQuestion();
      question.value = { zone_a: ["item_1"] };

      // Act
      model.validate();

      // Assert
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });

    it("drops unknown zones and items instead of clearing everything", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = {
        zone_a: ["item_1", "ghost_item"],
        ghost_zone: ["item_2"],
      };

      // Act
      question.clearIncorrectValues();

      // Assert
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });
  });

  describe("addItemFromDesigner", () => {
    it("appends a new choice with the next free itemN value in design mode", () => {
      // Arrange
      const { model, question } = createQuestion();
      model.setDesignMode(true);

      // Act
      question.addItemFromDesigner();

      // Assert
      expect(question.choices).toHaveLength(4);
      expect(question.choices[3].value).toBe("item4");
    });

    it("does nothing at runtime", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.addItemFromDesigner();

      // Assert
      expect(question.choices).toHaveLength(3);
    });
  });

  describe("survey data flow", () => {
    let model: Model;
    let question: DragCategorizeQuestion;

    beforeEach(() => {
      ({ model, question } = createQuestion());
    });

    it("stores the placement in survey data", () => {
      // Act
      question.value = { zone_a: ["item_1"] };

      // Assert
      expect(model.data.q1).toEqual({ zone_a: ["item_1"] });
    });

    it("rebuilds zone contents when survey data is set externally", () => {
      // Act
      model.data = { q1: { zone_b: ["item_2"] } };

      // Assert
      expect(question.getZoneItems("zone_b").map((i) => i.value)).toEqual([
        "item_2",
      ]);
      expect(question.pool.map((i) => i.value)).toEqual(["item_1", "item_3"]);
    });
  });
});

/** Mirrors what handlePointerDown records before a drag starts. */
function simulateDragFrom(
  question: DragCategorizeQuestion,
  itemValue: string,
  zoneId: string,
): void {
  (
    question as unknown as {
      draggedChoiceValue: string;
      draggedFromZoneIdValue: string;
    }
  ).draggedChoiceValue = itemValue;
  (
    question as unknown as { draggedFromZoneIdValue: string }
  ).draggedFromZoneIdValue = zoneId;
}
