import { Model } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { registerAnyAnsweredGlobals } from "../infrastructure/registry";

describe("registerAnyAnsweredGlobals", () => {
  beforeAll(() => {
    registerAnyAnsweredGlobals();
    registerAnyAnsweredGlobals();
  });

  it("evaluates anyAnswered(...) with reactive value references", () => {
    const survey = new Model({
      elements: [
        { type: "checkbox", name: "qAB101_C103_D_E4_F5", choices: ["Item 1"] },
        { type: "radiogroup", name: "qAB101_C103_D_E4_F7", choices: ["Item 1"] },
        { type: "dropdown", name: "qAB101_Z001_D_E4_F17", choices: ["Item 1"] },
      ],
    });

    survey.data = {
      qAB101_C103_D_E4_F5: [],
      qAB101_C103_D_E4_F7: "",
      qAB101_Z001_D_E4_F17: "Item 1",
    };

    const result = survey.runCondition(
      "anyAnswered({qAB101_C103_D_E4_F5}, {qAB101_C103_D_E4_F7}, {qAB101_Z001_D_E4_F17})",
    );

    expect(result).toBe(true);
  });

  it("evaluates anyAnsweredByPrefix(...) for prefixed question names", () => {
    const survey = new Model({
      elements: [
        { type: "checkbox", name: "qAB101_C103_D_E4_F5", choices: ["Item 1"] },
        { type: "radiogroup", name: "qAB101_C103_D_E4_F7", choices: ["Item 1"] },
        { type: "dropdown", name: "qAB101_Z001_D_E4_F17", choices: ["Item 1"] },
      ],
    });

    survey.data = {
      qAB101_C103_D_E4_F5: [],
      qAB101_C103_D_E4_F7: "Item 2",
      qAB101_Z001_D_E4_F17: "",
    };

    const result = survey.runCondition("anyAnsweredByPrefix('qAB101_C103_D_E4')");

    expect(result).toBe(true);
  });
});
