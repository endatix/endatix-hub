import { describe, expect, it } from "vitest";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { findConvertibleChoiceQuestions } from "../inline-choice-conversion";

describe("inline-choice-conversion", () => {
  describe("findConvertibleChoiceQuestions", () => {
    it("detects dropdown and tagbox with inline choices", () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                choices: ["a", "b"],
              },
              {
                type: "tagbox",
                name: "q2",
                choices: [{ value: "1", text: "One" }],
              },
            ],
          },
        ],
      };
      const found = findConvertibleChoiceQuestions(json);
      expect(found.map((f) => f.name).sort()).toEqual(["q1", "q2"]);
    });

    it("skips edxDataListId", () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                choices: ["a"],
                [DATA_LIST_PROPERTY_NAME]: "list-1",
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it("skips choicesByUrl", () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                choices: ["a"],
                choicesByUrl: "https://example.com",
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it("skips choicesFromQuestion", () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                choices: ["a"],
                choicesFromQuestion: "q0",
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it("applies threshold", () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                choices: Array.from({ length: 9 }, (_, i) => `c${i}`),
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json, 10)).toHaveLength(0);
      expect(findConvertibleChoiceQuestions(json, 9)).toHaveLength(1);
    });
  });
});
