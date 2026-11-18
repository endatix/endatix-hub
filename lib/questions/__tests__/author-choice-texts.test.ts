import { describe, expect, it } from "vitest";
import { collectAuthorChoiceTexts } from "../author-choice-texts";

describe("collectAuthorChoiceTexts", () => {
  it("collects string choices, values and localized texts at any depth", () => {
    const texts = collectAuthorChoiceTexts({
      pages: [
        {
          elements: [
            { type: "radiogroup", name: "a", choices: ["Plain"] },
            {
              type: "paneldynamic",
              name: "loop",
              templateElements: [
                {
                  type: "checkbox",
                  name: "b",
                  choices: [
                    { value: "acme", text: "<b>ACME</b>" },
                    {
                      value: "globex",
                      text: { default: "Globex", de: "Globex DE" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect([...texts].sort()).toEqual(
      ["<b>ACME</b>", "Globex", "Globex DE", "Plain", "acme", "globex"].sort(),
    );
  });

  it("collects nothing from a definition without choices", () => {
    expect(
      collectAuthorChoiceTexts({ elements: [{ type: "text" }] }).size,
    ).toBe(0);
  });
});
