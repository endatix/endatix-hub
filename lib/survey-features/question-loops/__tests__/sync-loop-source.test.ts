import { beforeAll, describe, expect, it, vi } from "vitest";
import { ItemValue, SurveyModel } from "survey-core";
import {
  applyLimits,
  categorizeChoices,
  CategorizedChoices,
  flattenAndMerge,
  randomizeCategories,
  syncSingleLoopSource,
} from "../use-cases/sync-loop-source";
import { DynamicLoopModel, PanelItem } from "../types";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import {
  sampleLoopSurveySchema,
  SAMPLE_LOOP_PANEL_NAME,
  SAMPLE_LOOP_SOURCE_NAME,
  SAMPLE_TEMPLATE_ELEMENT_NAMES,
} from "./fixtures/sample-loop-survey";

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

function choice(value: string, text?: string): ItemValue {
  return new ItemValue(value, text ?? value);
}

function panelItem(
  itemValue: string,
  itemText?: string,
  loopIndex?: number,
): PanelItem {
  return {
    itemValue,
    itemText: itemText ?? itemValue,
    ...(loopIndex !== undefined && { loopIndex }),
  };
}

describe("categorizeChoices", () => {
  it("groups choices into priority, answered, and newOthers", () => {
    // arrange
    const choices = [
      choice("a", "A"),
      choice("b", "B"),
      choice("c", "C"),
      choice("d", "D"),
    ];
    const priorityValues = ["b"];
    const answeredValues = new Set<string>(["c"]);

    // act
    const result = categorizeChoices(choices, priorityValues, answeredValues);

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.priority[0]).toEqual({ itemValue: "b", itemText: "B" });
    expect(result.answered).toHaveLength(1);
    expect(result.answered[0]).toEqual({ itemValue: "c", itemText: "C" });
    expect(result.newOthers).toHaveLength(2);
    expect(result.newOthers.map((x) => x.itemValue).sort()).toEqual(["a", "d"]);
  });

  it("puts all in newOthers when priority and answered are empty", () => {
    // arrange
    const choices = [choice("x"), choice("y")];

    // act
    const result = categorizeChoices(choices, [], new Set());

    // assert
    expect(result.priority).toHaveLength(0);
    expect(result.answered).toHaveLength(0);
    expect(result.newOthers).toHaveLength(2);
  });

  it("uses choice.value as itemText when text is missing", () => {
    // arrange
    const choices = [choice("v")];

    // act
    const result = categorizeChoices(choices, ["v"], new Set());

    // assert
    expect(result.priority[0]).toEqual({ itemValue: "v", itemText: "v" });
  });

  it("ignores priority values not in choices", () => {
    // arrange
    const choices = [choice("a", "A")];

    // act
    const result = categorizeChoices(choices, ["a", "b", "c"], new Set());

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.priority[0].itemValue).toBe("a");
    expect(result.newOthers).toHaveLength(0);
  });

  it("answered takes precedence over newOthers (only priority wins over answered)", () => {
    // arrange
    const choices = [
      choice("p", "P"),
      choice("ans", "Ans"),
      choice("new", "New"),
    ];
    const priorityValues = ["p"];
    const answeredValues = new Set<string>(["ans"]);

    // act
    const result = categorizeChoices(choices, priorityValues, answeredValues);

    // assert
    expect(result.priority.map((x) => x.itemValue)).toEqual(["p"]);
    expect(result.answered.map((x) => x.itemValue)).toEqual(["ans"]);
    expect(result.newOthers.map((x) => x.itemValue)).toEqual(["new"]);
  });
});

describe("applyLimits", () => {
  function categories(
    priority: string[],
    answered: string[],
    newOthers: string[],
  ): CategorizedChoices {
    const toItems = (arr: string[]) =>
      arr.map((v) => ({ itemValue: v, itemText: v }));
    return {
      priority: toItems(priority),
      answered: toItems(answered),
      newOthers: toItems(newOthers),
    };
  }

  it("returns categories unchanged when maxLimit is 0", () => {
    // arrange
    const cat = categories(["p1"], ["a1"], ["o1"]);

    // act
    const result = applyLimits(cat, 0);

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.answered).toHaveLength(1);
    expect(result.newOthers).toHaveLength(1);
  });

  it("returns categories unchanged when maxLimit is negative", () => {
    // arrange
    const cat = categories(["p1"], [], ["o1"]);

    // act
    const result = applyLimits(cat, -1);

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.newOthers).toHaveLength(1);
  });

  it("returns all when total size is less than maxLimit", () => {
    // arrange
    const cat = categories(["p1"], ["a1"], ["o1"]);

    // act
    const result = applyLimits(cat, 10);

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.answered).toHaveLength(1);
    expect(result.newOthers).toHaveLength(1);
  });

  it("returns only priority when maxLimit equals priority count", () => {
    // arrange
    const cat = categories(["p1", "p2"], ["a1"], ["o1", "o2"]);

    // act
    const result = applyLimits(cat, 2);

    // assert
    expect(result.priority).toHaveLength(2);
    expect(result.answered).toHaveLength(0);
    expect(result.newOthers).toHaveLength(0);
  });

  it("high value: more priority items than maxLimit returns all priority (no truncation)", () => {
    // arrange
    const cat = categories(["p1", "p2", "p3"], [], ["o1", "o2"]);

    // act
    const result = applyLimits(cat, 2);

    // assert
    expect(result.priority).toHaveLength(3);
    expect(result.newOthers).toHaveLength(0);
  });

  it("fills remaining slots with answered then newOthers", () => {
    // arrange
    const cat = categories(["p1"], ["a1", "a2"], ["o1", "o2", "o3"]);
    const maxLimit = 4;

    // act
    const result = applyLimits(cat, maxLimit);

    // assert
    expect(result.priority).toHaveLength(1);
    expect(result.answered).toHaveLength(2);
    expect(result.newOthers).toHaveLength(1);
    expect([
      ...result.priority,
      ...result.answered,
      ...result.newOthers,
    ]).toHaveLength(4);
  });

  it("caps answered and newOthers by remaining slots", () => {
    // arrange
    const cat = categories(["p1", "p2"], ["a1", "a2", "a3"], ["o1", "o2"]);
    const maxLimit = 4;

    // act
    const result = applyLimits(cat, maxLimit);

    // assert
    expect(result.priority).toHaveLength(2);
    expect(result.answered).toHaveLength(2);
    expect(result.newOthers).toHaveLength(0);
  });
});

describe("randomizeCategories", () => {
  it("returns categories unchanged when shouldRandomize is false", () => {
    // arrange
    const cat: CategorizedChoices = {
      priority: [panelItem("p1")],
      answered: [panelItem("a1")],
      newOthers: [panelItem("o1")],
    };

    // act
    const result = randomizeCategories(cat, false);

    // assert
    expect(result).toBe(cat);
    expect(result.priority).toHaveLength(1);
    expect(result.answered).toHaveLength(1);
    expect(result.newOthers).toHaveLength(1);
  });

  it("keeps answered unchanged and shuffles priority + newOthers into newOthers", () => {
    // arrange
    const cat: CategorizedChoices = {
      priority: [panelItem("p1"), panelItem("p2")],
      answered: [panelItem("a1")],
      newOthers: [panelItem("o1"), panelItem("o2")],
    };

    // act
    const result = randomizeCategories(cat, true);

    // assert
    expect(result.priority).toHaveLength(0);
    expect(result.answered).toEqual(cat.answered);
    expect(result.newOthers).toHaveLength(4);
    expect(new Set(result.newOthers.map((x) => x.itemValue))).toEqual(
      new Set(["p1", "p2", "o1", "o2"]),
    );
  });
});

describe("flattenAndMerge", () => {
  it("returns combined list with loopIndex from position when no existing map entries", () => {
    // arrange
    const cat: CategorizedChoices = {
      priority: [panelItem("p1")],
      answered: [],
      newOthers: [panelItem("o1")],
    };
    const existingMap = new Map<string, PanelItem>();

    // act
    const result = flattenAndMerge(cat, existingMap);

    // assert
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ itemValue: "p1", loopIndex: 0 });
    expect(result[1]).toMatchObject({ itemValue: "o1", loopIndex: 1 });
  });

  it("merges existing panel item (loopIndex, etc.) when present in map", () => {
    // arrange
    const cat: CategorizedChoices = {
      priority: [],
      answered: [panelItem("a1")],
      newOthers: [],
    };
    const existingMap = new Map<string, PanelItem>([
      ["a1", { itemValue: "a1", itemText: "A1", loopIndex: 2 }],
    ]);

    // act
    const result = flattenAndMerge(cat, existingMap);

    // assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      itemValue: "a1",
      itemText: "A1",
      loopIndex: 2,
    });
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

  it("updates panel value from selected choices (integration with fixture)", () => {
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
    expect(value.map((p) => p.itemValue).sort()).toEqual(["kia", "toyota"]);
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

  it("creates panels when loop source has value from schema defaultValue or after load (integration)", () => {
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

  it("creates panels when source has value on survey load / saved data (integration)", () => {
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

  it("keeps answered panel values and shuffles the rest when randomizeLoop is true (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const dispose = bindFeatureToSurvey(survey);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = [];
    panel.maxLoopCount = "10";
    panel.randomizeLoop = true;
    source.value = ["kia", "toyota", "honda", "nissan", "huyndai"];

    syncSingleLoopSource(survey, panel);

    // Fill answers in first two panels (kia, toyota)
    survey.setValue(
      `${SAMPLE_LOOP_PANEL_NAME}[0].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      "answered-kia",
    );
    survey.setValue(
      `${SAMPLE_LOOP_PANEL_NAME}[1].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      "answered-toyota",
    );

    // act – sync again (e.g. source re-evaluated or same choices); answered panels must be preserved
    syncSingleLoopSource(survey, panel);

    // assert – panels that had answers (kia, toyota) still exist and their itemValue is preserved
    const value = panel.value as PanelItem[];
    expect(value.length).toBeGreaterThanOrEqual(2);
    const itemValues = value.map((p) => p.itemValue);
    expect(itemValues).toContain("kia");
    expect(itemValues).toContain("toyota");
    expect(
      survey.getValue(
        `${SAMPLE_LOOP_PANEL_NAME}[0].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      ),
    ).toBe("answered-kia");
    expect(
      survey.getValue(
        `${SAMPLE_LOOP_PANEL_NAME}[1].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      ),
    ).toBe("answered-toyota");

    dispose?.();
  });

  it("when loop source question updates, loop panel keeps answered values (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const dispose = bindFeatureToSurvey(survey);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    const panel = survey.getQuestionByName(
      SAMPLE_LOOP_PANEL_NAME,
    ) as DynamicLoopModel;
    if (!panel || !source) throw new Error("fixture missing question");
    panel.loopSource = [SAMPLE_LOOP_SOURCE_NAME];
    panel.priorityItems = [];
    panel.maxLoopCount = "10";
    panel.randomizeLoop = false;

    source.value = ["kia", "toyota", "honda"];
    syncSingleLoopSource(survey, panel);

    // User fills in panel 0 and 1
    survey.setValue(
      `${SAMPLE_LOOP_PANEL_NAME}[0].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      "my-answer-kia",
    );
    survey.setValue(
      `${SAMPLE_LOOP_PANEL_NAME}[1].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      "my-answer-toyota",
    );

    // act – source selection changes (e.g. user adds/removes a brand); sync again
    source.value = ["kia", "toyota", "honda", "nissan"];
    syncSingleLoopSource(survey, panel);

    // assert – existing answered panels (kia, toyota) still present and user input preserved
    const value = panel.value as PanelItem[];
    const itemValues = value.map((p) => p.itemValue);
    expect(itemValues).toContain("kia");
    expect(itemValues).toContain("toyota");
    expect(itemValues).toContain("honda");
    expect(itemValues).toContain("nissan");
    expect(value.length).toBe(4);
    expect(
      survey.getValue(
        `${SAMPLE_LOOP_PANEL_NAME}[0].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      ),
    ).toBe("my-answer-kia");
    expect(
      survey.getValue(
        `${SAMPLE_LOOP_PANEL_NAME}[1].${SAMPLE_TEMPLATE_ELEMENT_NAMES[0]}`,
      ),
    ).toBe("my-answer-toyota");

    dispose?.();
  });
});
