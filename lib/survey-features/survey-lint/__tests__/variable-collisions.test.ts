import { describe, expect, it } from "vitest";
import { variableCollisions } from "../lint";

const FORM = {
  pages: [
    {
      elements: [
        { type: "text", name: "segment" },
        { type: "text", name: "q2", valueName: "region" },
        {
          type: "paneldynamic",
          name: "family",
          templateElements: [{ type: "text", name: "inner" }],
        },
      ],
    },
  ],
  calculatedValues: [{ name: "score", expression: "1" }],
};

describe("variableCollisions", () => {
  it("names each variable a root question or a calculated value already writes", () => {
    const names = ["Segment", "region", "score", "inner", "free"];

    expect(variableCollisions(FORM, names)).toEqual([
      { variable: "Segment", declaredBy: "question" },
      { variable: "region", declaredBy: "question" },
      { variable: "score", declaredBy: "calculatedValue" },
    ]);
  });

  it("finds nothing in a form with no questions", () => {
    expect(variableCollisions({}, ["segment"])).toEqual([]);
  });
});
