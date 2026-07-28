import { Model, Serializer } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "@/lib/survey-features/carry-forward";
import { isSupportedCarryForwardQuestionType } from "@/lib/survey-features/carry-forward/supported-question-types";
import { syncSingleCarryForwardTarget } from "@/lib/survey-features/carry-forward/use-cases/sync-carry-forward-target";
import { DRAG_CATEGORIZE_TYPE } from "../constants";
import type { DragCategorizeQuestion } from "../drag-categorize.model";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

describe("drag categorize carry forward", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("exposes the advanced carry forward properties", () => {
    // Assert
    for (const propertyName of [
      CARRY_FORWARD_ENABLED_PROPERTY,
      CARRY_FORWARD_SOURCES_PROPERTY,
      CARRY_FORWARD_MODE_PROPERTY,
      CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
      CARRY_FORWARD_MAX_CHOICES_PROPERTY,
    ]) {
      expect(
        Serializer.findProperty(DRAG_CATEGORIZE_TYPE, propertyName),
      ).toBeDefined();
    }
  });

  it("counts as a supported carry forward target type", () => {
    // Assert
    expect(isSupportedCarryForwardQuestionType(DRAG_CATEGORIZE_TYPE)).toBe(
      true,
    );
  });

  it("registers carry forward without breaking its own properties", () => {
    // Assert — the opt-in runs inside registerDragCategorizeModel, so this
    // guards against it clobbering the question's own metadata.
    expect(Serializer.findProperty(DRAG_CATEGORIZE_TYPE, "zones")).toBeDefined();
    expect(
      Serializer.findProperty(DRAG_CATEGORIZE_TYPE, "requireAllItems"),
    ).toBeDefined();
  });

  it("prunes placements when carried-forward items disappear", () => {
    // Arrange — items arriving from a source question can change between
    // sessions; stale zone contents must not survive.
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: DRAG_CATEGORIZE_TYPE,
              name: "q1",
              choices: ["item_1", "item_2"],
              zones: [{ value: "zone_a" }, { value: "zone_b" }],
            },
          ],
        },
      ],
    });
    const question = model.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    question.value = { zone_a: ["item_1"], zone_b: ["item_2"] };

    // Act — the source no longer offers item_2
    question.choices = ["item_1"] as never;
    question.clearIncorrectValues();

    // Assert
    expect(question.value).toEqual({ zone_a: ["item_1"] });
  });

  describe("carrying items forward from an image picker", () => {
    function createSurvey(): Model {
      return new Model({
        pages: [
          {
            elements: [
              {
                type: "imagepicker",
                name: "source",
                choices: [
                  {
                    value: "img1",
                    text: "Sunrise",
                    imageLink: "https://example.com/1.png",
                  },
                  { value: "img2", imageLink: "https://example.com/2.png" },
                ],
              },
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                zones: [{ value: "zone_a" }, { value: "zone_b" }],
                [CARRY_FORWARD_ENABLED_PROPERTY]: true,
                [CARRY_FORWARD_SOURCES_PROPERTY]: ["source"],
              },
            ],
          },
        ],
      });
    }

    it("brings the images across as draggable chips", () => {
      // Arrange
      const model = createSurvey();
      const target = model.getQuestionByName("q1");

      // Act
      syncSingleCarryForwardTarget(model, target as never);

      // Assert — the source names the image imageLink and the target imageUrl,
      // so without translation these chips would render as text only
      const items = (target as unknown as DragCategorizeQuestion).choices;
      expect(items.map((item) => String(item.value))).toEqual(["img1", "img2"]);
      expect(items.map((item) => item.imageUrl)).toEqual([
        "https://example.com/1.png",
        "https://example.com/2.png",
      ]);
    });

    it("carries the authored label and defaults items to a single zone", () => {
      // Arrange
      const model = createSurvey();
      const target = model.getQuestionByName("q1");

      // Act
      syncSingleCarryForwardTarget(model, target as never);

      // Assert
      const items = (target as unknown as DragCategorizeQuestion).choices;
      expect(items[0].text).toBe("Sunrise");
      expect(items.map((item) => item.allowMultipleZones)).toEqual([
        false,
        false,
      ]);
    });
  });
});
