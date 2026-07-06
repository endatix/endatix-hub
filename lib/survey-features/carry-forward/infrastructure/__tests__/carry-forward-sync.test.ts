import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemValue, Model, SurveyModel } from "survey-core";
import { registerAdvancedCarryForwardGlobals } from "../registry";
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from "../survey-bindings";
import {
  loadCarryForwardTargets,
  resetCarryForwardUpdateGuardForTests,
} from "../carry-forward-sync";
import * as syncModule from "../../use-cases/sync-carry-forward-target";
import type { AdvancedCarryForwardQuestion } from "../../types";

describe("loadCarryForwardTargets", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAdvancedCarryForwardGlobals();
    resetCarryForwardUpdateGuardForTests();
  });

  it("resets the re-entrancy guard when sync throws", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "dest",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["src"],
        },
        { type: "checkbox", name: "src", choices: ["A"] },
      ],
    });

    const syncSpy = vi
      .spyOn(syncModule, "syncSingleCarryForwardTarget")
      .mockImplementationOnce(() => {
        throw new Error("sync failed");
      })
      .mockImplementation(() => {});

    expect(() =>
      loadCarryForwardTargets(survey, {
        name: "src",
        value: ["A"],
      } as never),
    ).toThrow("sync failed");

    expect(syncSpy).toHaveBeenCalledTimes(1);

    expect(() =>
      loadCarryForwardTargets(survey, {
        name: "src",
        value: ["B"],
      } as never),
    ).not.toThrow();

    // A guard stuck true would silently no-op instead of throwing, which
    // `.not.toThrow()` alone can't distinguish from a real, successful sync.
    expect(syncSpy).toHaveBeenCalledTimes(2);
  });

  it("scopes the re-entrancy guard per survey instance", () => {
    const makeSurvey = () =>
      new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "dest",
            choices: [],
            advancedCarryForwardEnabled: true,
            advancedCarryForwardSources: ["src"],
          },
          { type: "checkbox", name: "src", choices: ["A"] },
        ],
      });

    const surveyA = makeSurvey();
    const surveyB = makeSurvey();
    let syncCallCount = 0;

    vi.spyOn(syncModule, "syncSingleCarryForwardTarget").mockImplementation(
      () => {
        syncCallCount += 1;
        if (syncCallCount === 1) {
          loadCarryForwardTargets(surveyB, {
            name: "src",
            value: ["A"],
          } as never);
        }
      },
    );

    loadCarryForwardTargets(surveyA, {
      name: "src",
      value: ["A"],
    } as never);

    expect(syncCallCount).toBe(2);
  });
});

describe("bindAdvancedCarryForwardToSurvey property changes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAdvancedCarryForwardGlobals();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  it("re-syncs when a carry-forward control property changes", () => {
    const model = new Model({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["brands"],
          advancedCarryForwardMode: "all",
        },
      ],
    });

    bindAdvancedCarryForwardToSurvey(model);
    model.setValue("brands", ["A", "B"]);

    const target = model.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;
    expect(target.choices.map((choice) => choice.value)).toEqual([
      "A",
      "B",
      "C",
    ]);

    target.setPropertyValue("advancedCarryForwardMode", "selected");
    model.setValue("brands", ["A", "B"]);

    expect(target.choices.map((choice) => choice.value)).toEqual(["A", "B"]);
  });

  it("syncs chained carry-forward targets in dependency order on initial bind", () => {
    const model = new Model({
      elements: [
        {
          type: "checkbox",
          name: "targetB",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["targetA"],
        },
        { type: "checkbox", name: "src", choices: ["X", "Y"] },
        {
          type: "checkbox",
          name: "targetA",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["src"],
        },
      ],
    });

    bindAdvancedCarryForwardToSurvey(model);

    const targetB = model.getQuestionByName("targetB");
    expect(targetB.choices.map((choice: ItemValue) => choice.value)).toEqual(["X", "Y"]);
  });

  it("re-syncs downstream targets when an upstream source value changes", () => {
    const model = new Model({
      elements: [
        {
          type: "checkbox",
          name: "targetB",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["targetA"],
        },
        { type: "checkbox", name: "src", choices: ["X", "Y"] },
        {
          type: "checkbox",
          name: "targetA",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["src"],
          advancedCarryForwardMode: "selected",
        },
      ],
    });

    bindAdvancedCarryForwardToSurvey(model);
    model.setValue("src", ["X"]);

    const targetB = model.getQuestionByName("targetB");
    expect(targetB.choices.map((choice: ItemValue) => choice.value)).toEqual(["X"]);
  });
});
