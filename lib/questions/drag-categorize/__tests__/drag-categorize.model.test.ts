import { Model } from "survey-core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DRAG_CATEGORIZE_TYPE, POOL_ZONE_ID } from "../constants";
import type { DragCategorizeQuestion } from "../drag-categorize.model";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

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
    registerDragCategorizeModel();
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

    it("moves a placed copy of an allowMultipleZones item between zones", () => {
      // Arrange — copies are made by dragging out of the pool, so dragging a
      // copy that is already in a zone relocates it like any other chip
      const { question } = createQuestion();
      question.value = { zone_a: ["item_3"] };
      simulateDragFrom(question, "item_3", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_3"), "zone_b");

      // Assert
      expect(question.value).toEqual({ zone_b: ["item_3"] });
    });

    it("keeps the other copies when moving one of them", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_3"], zone_b: ["item_3"] };
      simulateDragFrom(question, "item_3", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_3"), "zone_b");

      // Assert — zone_a gives up its copy, zone_b already had one
      expect(question.value).toEqual({ zone_b: ["item_3"] });
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

    it("moves a non-clone item without a recorded drag origin", () => {
      // Arrange — the placement, not the drag, says where the item sits
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"] };

      // Act — no simulateDragFrom, so no origin was recorded
      question.dropItem(getItem(question, "item_1"), "zone_b");

      // Assert — must not end up in both zones
      expect(question.value).toEqual({ zone_b: ["item_1"] });
    });

    it("repairs a non-clone item that was left in several zones", () => {
      // Arrange — the state allowMultipleZones leaves behind when turned off
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"], zone_b: ["item_1"] };
      simulateDragFrom(question, "item_1", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_1"), "zone_b");

      // Assert
      expect(question.value).toEqual({ zone_b: ["item_1"] });
    });

    it("returning a non-clone item to the pool clears every zone", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"], zone_b: ["item_1"] };
      simulateDragFrom(question, "item_1", "zone_a");

      // Act
      question.dropItem(getItem(question, "item_1"), POOL_ZONE_ID);

      // Assert
      expect(question.isEmpty()).toBe(true);
    });

    it("keeps other copies when a clone item is returned to the pool", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_3"], zone_b: ["item_3"] };
      simulateDragFrom(question, "item_3", "zone_a");

      // Act — only the copy dragged out of zone_a is removed
      question.dropItem(getItem(question, "item_3"), POOL_ZONE_ID);

      // Assert
      expect(question.value).toEqual({ zone_b: ["item_3"] });
    });

    it("does not reuse the previous drag's origin", () => {
      // Arrange
      const { question } = createQuestion();
      simulateDragFrom(question, "item_3", "zone_a");
      question.dropItem(getItem(question, "item_3"), "zone_b");

      // Act — a clone item dragged straight from the pool, no new origin
      question.dropItem(getItem(question, "item_3"), "zone_a");

      // Assert — zone_b keeps its copy; the stale origin is not applied
      expect(question.value).toEqual({
        zone_b: ["item_3"],
        zone_a: ["item_3"],
      });
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

    it("holds a non-clone item to one zone", () => {
      // Arrange — allowMultipleZones was turned off after item_1 was placed
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"], zone_b: ["item_1"] };

      // Act
      question.clearIncorrectValues();

      // Assert — first zone in definition order wins
      expect(question.value).toEqual({ zone_a: ["item_1"] });
    });

    it("leaves a clone item in several zones", () => {
      // Arrange — item_3 has allowMultipleZones
      const { question } = createQuestion();
      question.value = { zone_a: ["item_3"], zone_b: ["item_3"] };

      // Act
      question.clearIncorrectValues();

      // Assert
      expect(question.value).toEqual({
        zone_a: ["item_3"],
        zone_b: ["item_3"],
      });
    });
  });

  describe("reserved zone value", () => {
    it("warns when a zone is declared with the pool's reserved id", () => {
      // Arrange
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      new Model({
        pages: [
          {
            elements: [
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                choices: [{ value: "item_1" }],
                zones: [{ value: POOL_ZONE_ID }, { value: "zone_b" }],
              },
            ],
          },
        ],
      });

      // Assert — otherwise drops on that zone silently return to the pool
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(POOL_ZONE_ID),
      );
      warn.mockRestore();
    });

    it("stays quiet for ordinary zone values", () => {
      // Arrange
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      createQuestion();

      // Assert
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("display value", () => {
    it("renders zones and item labels as readable text", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.value = { zone_a: ["item_1"], zone_b: ["item_2", "item_3"] };

      // Assert
      expect(question.displayValue).toBe(
        "Zone A: Item 1; Zone B: Item 2, Item 3",
      );
    });

    it("orders zones by the definition, not by the value's key order", () => {
      // Arrange
      const { question } = createQuestion();

      // Act — zone_b filled first
      question.value = { zone_b: ["item_2"], zone_a: ["item_1"] };

      // Assert
      expect(question.displayValue).toBe("Zone A: Item 1; Zone B: Item 2");
    });

    it("omits zones the respondent left empty", () => {
      // Arrange
      const { question } = createQuestion();

      // Act
      question.value = { zone_b: ["item_2"] };

      // Assert
      expect(question.displayValue).toBe("Zone B: Item 2");
    });

    it("pipes into text instead of rendering [object Object]", () => {
      // Arrange
      const { model, question } = createQuestion();
      question.value = { zone_a: ["item_1"] };

      // Act
      const piped = model.processText("Sorted: {q1}", true);

      // Assert
      expect(piped).toBe("Sorted: Zone A: Item 1");
    });

    it("falls back to zone id and item value when nothing was authored", () => {
      // Arrange — no zone text, no item text
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                choices: [{ value: "item_1" }],
                zones: [{ value: "zone_a" }, { value: "zone_b" }],
              },
            ],
          },
        ],
      });
      const question = model.getQuestionByName(
        "q1",
      ) as unknown as DragCategorizeQuestion;

      // Act
      question.value = { zone_a: ["item_1"] };

      // Assert — an identifier beats a blank cell in an export
      expect(question.displayValue).toBe("zone_a: item_1");
    });
  });

  describe("getPlainData", () => {
    it("emits one node per zone instead of a single choice node", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_a: ["item_1"] };

      // Act
      const plainData = question.getPlainData();

      // Assert
      expect(plainData.isNode).toBe(true);
      expect(plainData.data?.map((node) => node.name)).toEqual([
        "zone_a",
        "zone_b",
      ]);
      expect(plainData.data?.[0]).toMatchObject({
        name: "zone_a",
        title: "Zone A",
        value: ["item_1"],
        displayValue: ["Item 1"],
        isNode: false,
      });
    });

    it("drops empty zones when includeEmpty is off", () => {
      // Arrange
      const { question } = createQuestion();
      question.value = { zone_b: ["item_2"] };

      // Act
      const plainData = question.getPlainData({ includeEmpty: false });

      // Assert
      expect(plainData.data?.map((node) => node.name)).toEqual(["zone_b"]);
    });

    it("keeps the comment node contributed by the base class", () => {
      // Arrange
      const { question } = createQuestion();
      question.showCommentArea = true;
      question.value = { zone_a: ["item_1"] };
      question.comment = "sorted by colour";

      // Act
      const plainData = question.getPlainData();

      // Assert
      const comment = plainData.data?.find((node) => node.isComment);
      expect(comment?.displayValue).toBe("sorted by colour");
    });
  });

  describe("items hidden by a condition", () => {
    // SurveyJS calls clearIncorrectValues from runItemsCondition the moment a
    // condition flips, so this runs mid-form during normal navigation.
    function createGatedSurvey(
      gatedChoiceProps: Record<string, unknown> = {},
    ): { model: Model; question: DragCategorizeQuestion } {
      const model = new Model({
        pages: [
          {
            elements: [
              { type: "text", name: "gate" },
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                choices: [
                  { value: "item_1" },
                  {
                    value: "item_2",
                    visibleIf: "{gate} = 'show'",
                    ...gatedChoiceProps,
                  },
                ],
                zones: [{ value: "zone_a" }, { value: "zone_b" }],
              },
            ],
          },
        ],
      });
      model.setValue("gate", "show");
      return {
        model,
        question: model.getQuestionByName(
          "q1",
        ) as unknown as DragCategorizeQuestion,
      };
    }

    it("restores the placement when the item becomes visible again", () => {
      // Arrange
      const { model, question } = createGatedSurvey();
      question.value = { zone_a: ["item_1", "item_2"] };

      // Act — hide, then unhide
      model.setValue("gate", "hide");
      const whileHidden = question.value;
      model.setValue("gate", "show");

      // Assert — hiding must not destroy the respondent's answer
      expect(whileHidden).toEqual({ zone_a: ["item_1"] });
      expect(question.value).toEqual({ zone_a: ["item_1", "item_2"] });
    });

    it("restores an item that was the only answer", () => {
      // Arrange — the value empties out entirely while the item is hidden,
      // which is where the base class would stop looking.
      const { model, question } = createGatedSurvey();
      question.value = { zone_b: ["item_2"] };

      // Act
      model.setValue("gate", "hide");
      const whileHidden = question.value;
      model.setValue("gate", "show");

      // Assert
      expect(whileHidden).toBeUndefined();
      expect(question.value).toEqual({ zone_b: ["item_2"] });
    });

    it("restores an item into every zone it occupied", () => {
      // Arrange — only a clone item may legitimately hold several zones
      const { model, question } = createGatedSurvey({
        allowMultipleZones: true,
      });
      question.value = { zone_a: ["item_2"], zone_b: ["item_2"] };

      // Act
      model.setValue("gate", "hide");
      model.setValue("gate", "show");

      // Assert
      expect(question.value).toEqual({
        zone_a: ["item_2"],
        zone_b: ["item_2"],
      });
    });

    it("forgets the stash once the respondent changes the answer", () => {
      // Arrange
      const { model, question } = createGatedSurvey();
      question.value = { zone_a: ["item_2"] };
      model.setValue("gate", "hide");

      // Act — the respondent answers again while the item is hidden
      question.value = { zone_b: ["item_1"] };
      model.setValue("gate", "show");

      // Assert — the newer answer wins; the stale placement is not resurrected
      expect(question.value).toEqual({ zone_b: ["item_1"] });
    });

    it("does not restore an item that was deleted from the definition", () => {
      // Arrange
      const { model, question } = createGatedSurvey();
      question.value = { zone_a: ["item_2"] };
      model.setValue("gate", "hide");

      // Act — the item is removed for good, then the condition flips back
      question.choices = [question.choices[0]];
      model.setValue("gate", "show");

      // Assert
      expect(question.value).toBeUndefined();
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
