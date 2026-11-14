import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import { DynamicLoopModel, SourceSelectionModes } from "../types";
import {
  CAROUSEL_ITEMS,
  CAROUSEL_LOOP_NAME,
  CAROUSEL_SOURCE_NAME,
  carouselLoopSurvey,
} from "./fixtures/carousel-loop-survey";

const { All, SelectedOnly, UnselectedOnly } = SourceSelectionModes;
const ALL_ITEMS = [...CAROUSEL_ITEMS];
const PRESELECTED = ["1", "3"];

/** Items each mode loops over when `selected` is the answer. */
function expectedItems(mode: string, selected: string[]): string[] {
  if (mode === All) return ALL_ITEMS;
  if (mode === UnselectedOnly) {
    return ALL_ITEMS.filter((item) => !selected.includes(item));
  }
  return ALL_ITEMS.filter((item) => selected.includes(item));
}

const disposers: Array<() => void> = [];

/** Loads the form JSON the way the runner does: build the model, then bind. */
function loadAndBind(json: object): SurveyModel {
  const survey = new SurveyModel(json);
  disposers.push(bindFeatureToSurvey(survey));
  return survey;
}

function getLoop(survey: SurveyModel): DynamicLoopModel {
  return survey.getQuestionByName(
    CAROUSEL_LOOP_NAME,
  ) as unknown as DynamicLoopModel;
}

/** The loop's items, sorted: randomizeLoop shuffles the order, not the set. */
function loopItems(survey: SurveyModel): string[] {
  const loop = getLoop(survey);
  expect(loop.panelCount).toBe(((loop.value ?? []) as unknown[]).length);
  return ((loop.value ?? []) as Array<{ itemValue: string }>)
    .map((panel) => panel.itemValue)
    .sort();
}

const LOOP_OVER_VALUES = [SelectedOnly, UnselectedOnly, All];

describe("Loop over on a randomized carousel loop (hub#1377 regression)", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
  });

  describe.each(LOOP_OVER_VALUES)("%s", (mode) => {
    const json = carouselLoopSurvey({ choicePattern: mode });

    it("loads the form JSON without throwing", () => {
      expect(() => loadAndBind(json)).not.toThrow();
    });

    it("round-trips the value through toJSON()", () => {
      const saved = getLoop(loadAndBind(json)).toJSON();
      // Selected Only is the property default, so SurveyJS leaves it out.
      const serialized = mode === SelectedOnly ? undefined : mode;

      expect(saved.choicePattern).toBe(serialized);
      const reloaded = loadAndBind(carouselLoopSurvey(saved));
      expect(getLoop(reloaded).choicePattern).toBe(mode);
    });

    it("loops over the expected items before any answer", () => {
      const survey = loadAndBind(json);

      expect(loopItems(survey)).toEqual(expectedItems(mode, []));
    });

    it("loops over the expected items after the source is answered", () => {
      const survey = loadAndBind(json);

      survey.setValue(CAROUSEL_SOURCE_NAME, PRESELECTED);

      expect(loopItems(survey)).toEqual(expectedItems(mode, PRESELECTED));
    });

    it("keeps the same item set over repeated randomized loads", () => {
      const sets = Array.from({ length: 5 }, () => {
        const survey = loadAndBind(json);
        survey.setValue(CAROUSEL_SOURCE_NAME, PRESELECTED);
        return loopItems(survey);
      });

      for (const set of sets) {
        expect(set).toEqual(expectedItems(mode, PRESELECTED));
      }
    });
  });
});

describe("Loop over with a preselected source on load", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
  });

  const PRESELECTED_SOURCES = [
    ["defaultValue", { defaultValue: PRESELECTED }],
    [
      "defaultValueExpression",
      {
        defaultValueExpression: `[${PRESELECTED.map((v) => `'${v}'`).join(", ")}]`,
      },
    ],
    [
      "a hidden source with defaultValue",
      { visible: false, defaultValue: PRESELECTED },
    ],
  ] as const;

  describe.each(PRESELECTED_SOURCES)("%s", (_label, sourceOverrides) => {
    it.each(LOOP_OVER_VALUES)("%s loops over the expected items", (mode) => {
      const survey = loadAndBind(
        carouselLoopSurvey({ choicePattern: mode }, sourceOverrides),
      );

      expect(survey.getValue(CAROUSEL_SOURCE_NAME)).toEqual(PRESELECTED);
      expect(loopItems(survey)).toEqual(expectedItems(mode, PRESELECTED));
    });
  });
});

describe("Loop over in the designer (hub#1377 regression)", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  it("keeps All set through the property grid in creator.JSON", () => {
    const creator = new SurveyCreatorModel({});
    creator.JSON = carouselLoopSurvey();
    const loop = creator.survey.getQuestionByName(CAROUSEL_LOOP_NAME);
    creator.selectElement(loop);
    const loopOver = creator.propertyGrid.getQuestionByName("choicePattern");

    loopOver.value = All;

    expect((loop as unknown as DynamicLoopModel).choicePattern).toBe(All);
    const saved = creator.JSON;
    expect(saved.pages[1].elements[0].choicePattern).toBe(All);

    const reloaded = new SurveyCreatorModel({});
    reloaded.JSON = saved;
    reloaded.selectElement(
      reloaded.survey.getQuestionByName(CAROUSEL_LOOP_NAME),
    );
    expect(reloaded.propertyGrid.getQuestionByName("choicePattern").value).toBe(
      All,
    );
  });
});
