import { beforeAll, describe, expect, it, vi } from "vitest";
import { ItemValue, SurveyModel } from "survey-core";
import {
  groupChoicesByPriority,
  applyMaxLimit,
  syncSingleLoopSource,
} from "../use-cases/sync-loop-source";
import { DynamicLoopModel } from "../types";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import {
  sampleLoopSurveySchema,
  SAMPLE_LOOP_PANEL_NAME,
  SAMPLE_LOOP_SOURCE_NAME,
} from "./fixtures/sample-loop-survey";

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

function choice(value: string, text?: string): ItemValue {
  return new ItemValue(value, text ?? value);
}

describe("groupChoicesByPriority", () => {
  it("groups choices into priority and others groups by priority values", () => {
    // arrange
    const choices = [choice("a", "A"), choice("b", "B"), choice("c", "C")];

    // act
    const result = groupChoicesByPriority(choices, ["b"]);

    // assert
    expect(result.priorityChoicesGroup.size).toBe(1);
    expect(result.othersChoicesGroup.size).toBe(2);
    expect(result.priorityChoicesGroup.get("b")).toEqual({
      itemValue: "b",
      itemText: "B",
    });
    expect(result.othersChoicesGroup.has("a")).toBe(true);
    expect(result.othersChoicesGroup.has("c")).toBe(true);
  });

  it("puts all in others when priority list is empty", () => {
    // arrange
    const choices = [choice("x"), choice("y")];

    // act
    const result = groupChoicesByPriority(choices, []);

    // assert
    expect(result.priorityChoicesGroup.size).toBe(0);
    expect(result.othersChoicesGroup.size).toBe(2);
  });

  it("puts all in priority when all choice values are in priority list", () => {
    // arrange
    const choices = [choice("1", "One"), choice("2", "Two")];

    // act
    const result = groupChoicesByPriority(choices, ["1", "2"]);

    // assert
    expect(result.priorityChoicesGroup.size).toBe(2);
    expect(result.othersChoicesGroup.size).toBe(0);
  });

  it("uses choice.value as itemText when text is missing", () => {
    // arrange
    const choices = [choice("v")];

    // act
    const result = groupChoicesByPriority(choices, ["v"]);

    // assert
    expect(result.priorityChoicesGroup.get("v")).toEqual({
      itemValue: "v",
      itemText: "v",
    });
  });

  it("ignores priority values that are not in choices", () => {
    // arrange
    const choices = [choice("a")];

    // act
    const result = groupChoicesByPriority(choices, ["a", "b", "c"]);

    // assert
    expect(result.priorityChoicesGroup.size).toBe(1);
    expect(result.priorityChoicesGroup.has("a")).toBe(true);
    expect(result.othersChoicesGroup.size).toBe(0);
  });
});

describe("applyMaxLimit", () => {
  function grouped(
    priority: string[],
    others: string[],
  ): {
    priorityChoicesGroup: Map<string, { itemText: string; itemValue: string }>;
    othersChoicesGroup: Map<string, { itemText: string; itemValue: string }>;
  } {
    const toMap = (arr: string[]) =>
      new Map(arr.map((v) => [v, { itemValue: v, itemText: v }]));
    return {
      priorityChoicesGroup: toMap(priority),
      othersChoicesGroup: toMap(others),
    };
  }

  it("returns all when maxLimit is 0", () => {
    // arrange
    const g = grouped(["p1"], ["o1", "o2"]);

    // act
    const result = applyMaxLimit(g as any, 0);

    // assert
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.itemValue).sort()).toEqual(["o1", "o2", "p1"]);
  });

  it("returns all when maxLimit is negative", () => {
    // arrange
    const g = grouped(["p1"], ["o1"]);

    // act
    const result = applyMaxLimit(g as any, -1);

    // assert
    expect(result).toHaveLength(2);
  });

  it("returns all when total size is less than maxLimit", () => {
    // arrange
    const g = grouped(["p1"], ["o1"]);

    // act
    const result = applyMaxLimit(g as any, 10);

    // assert
    expect(result).toHaveLength(2);
  });

  it("returns only priority items when maxLimit equals priority count", () => {
    // arrange
    const g = grouped(["p1", "p2"], ["o1", "o2"]);

    // act
    const result = applyMaxLimit(g as any, 2);

    // assert
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.itemValue).sort()).toEqual(["p1", "p2"]);
  });

  it("high value: more priority items than maxLimit returns all priority (no truncation of priority)", () => {
    // arrange
    const g = grouped(["p1", "p2", "p3"], ["o1", "o2"]);

    // act
    const result = applyMaxLimit(g as any, 2);

    // assert
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.itemValue).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("high value: maxLimit less than sum of priority + others fills with priority then caps others", () => {
    // arrange
    const g = grouped(["p1", "p2"], ["o1", "o2", "o3", "o4"]);

    // act
    const result = applyMaxLimit(g as any, 4);

    // assert
    expect(result).toHaveLength(4);
    const values = result.map((r) => r.itemValue);
    expect(values).toContain("p1");
    expect(values).toContain("p2");
    const othersInResult = values.filter((v) =>
      ["o1", "o2", "o3", "o4"].includes(v),
    );
    expect(othersInResult).toHaveLength(2);
  });

  it("remaining slots are filled from others when others count >= remainingSlots", () => {
    // arrange
    const g = grouped(["p1"], ["o1", "o2", "o3"]);

    // act
    const result = applyMaxLimit(g as any, 2);

    // assert
    expect(result).toHaveLength(2);
    expect(result[0].itemValue).toBe("p1");
    expect(["o1", "o2", "o3"]).toContain(result[1].itemValue);
  });
});

describe("syncSingleLoopSource", () => {
  it("does nothing when panel is not a loop question", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [{ type: "text", name: "t1" }],
    });
    const panel = survey.getQuestionByName("t1") as unknown as DynamicLoopModel;
    const setValue = vi.fn();
    panel.value = undefined;
    Object.defineProperty(panel, "value", {
      set: setValue,
      get: () => undefined,
      configurable: true,
    });

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    expect(setValue).not.toHaveBeenCalled();
  });

  it("updates panel value from selected choices when loop source has value (integration with fixture)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = [];
    panel.maxLoopCount = "10";
    panel.randomizeLoop = false;
    source.value = ["kia", "toyota"];

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    const value = panel.value as Array<{ itemValue: string }>;
    expect(Array.isArray(value)).toBe(true);
    expect(value.length).toBe(2);
    const itemValues = value.map((p) => p.itemValue).sort();
    expect(itemValues).toEqual(["kia", "toyota"]);
  });

  it("respects maxLoopCount less than selected count (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = [];
    panel.maxLoopCount = "2";
    panel.randomizeLoop = false;
    source.value = ["kia", "huyndai", "honda", "toyota", "nissan"];

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(2);
  });

  it("puts priority items first when priorityItems set (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = ["nissan", "toyota"];
    panel.maxLoopCount = "3";
    panel.randomizeLoop = false;
    source.value = ["kia", "nissan", "toyota"];

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(3);
    expect(value[0].itemValue).toBe("nissan");
    expect(value[1].itemValue).toBe("toyota");
    expect(value[2].itemValue).toBe("kia");
  });

  it("creates panels when loop source has value (e.g. from schema defaultValue or after load) (integration)", () => {
    // arrange
    const schemaWithDefault = {
      elements: [
        {
          type: "tagbox",
          name: "brands",
          title: "Brands",
          choices: [
            { value: "kia", text: "Kia" },
            { value: "honda", text: "Honda" },
            { value: "toyota", text: "Toyota" },
          ],
          defaultValue: ["kia", "honda"],
        },
        {
          type: "paneldynamic",
          name: "favouriteCars",
          templateElements: [{ type: "text", name: "q1" }],
          loopSource: ["brands"],
          maxLoopCount: "10",
          randomizeLoop: false,
        },
      ],
    };
    const survey = new SurveyModel(schemaWithDefault as any);
    const source = survey.getQuestionByName("brands");
    const panel = survey.getQuestionByName("favouriteCars") as DynamicLoopModel;
    source!.value = ["kia", "honda"];

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(2);
    expect(value.map((p) => p.itemValue).sort()).toEqual(["honda", "kia"]);
  });

  it("creates panels when source has value on survey load (e.g. loaded/saved data) (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = [];
    panel.maxLoopCount = "10";
    panel.randomizeLoop = false;
    survey.setValue(SAMPLE_LOOP_SOURCE_NAME, ["kia", "huyndai", "toyota"]);

    // act
    syncSingleLoopSource(survey, panel);

    // assert
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(3);
    expect(new Set(value.map((p) => p.itemValue))).toEqual(
      new Set(["kia", "huyndai", "toyota"]),
    );
  });
});
