import { Model, QuestionMatrixModel } from "survey-core";
import { beforeEach, describe, expect, it } from "vitest";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import {
  getDataListAnswerValues,
  getDataListIdFromQuestion,
  isDataListQuestionType,
  parseDataListId,
} from "../data-list-survey-integration";
import { registerDataListGlobals } from "../registry";

describe("data-list-survey-integration", () => {
  beforeEach(() => {
    registerDataListGlobals();
  });

  describe("parseDataListId", () => {
    it("returns string ids unchanged", () => {
      expect(parseDataListId("42")).toBe("42");
    });

    it("coerces finite numbers to strings", () => {
      expect(parseDataListId(99)).toBe("99");
    });

    it("returns null for empty or invalid values", () => {
      expect(parseDataListId("")).toBeNull();
      expect(parseDataListId(null)).toBeNull();
      expect(parseDataListId(undefined)).toBeNull();
      expect(parseDataListId(NaN)).toBeNull();
    });
  });

  describe("isDataListQuestionType", () => {
    it("accepts registered question types only", () => {
      expect(isDataListQuestionType("dropdown")).toBe(true);
      expect(isDataListQuestionType("tagbox")).toBe(true);
      expect(isDataListQuestionType("radiogroup")).toBe(false);
    });
  });

  describe("getDataListIdFromQuestion", () => {
    it("reads id from Model JSON via getPropertyValue without jsonObj", () => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "country",
                [DATA_LIST_PROPERTY_NAME]: "42",
              },
            ],
          },
        ],
      });

      const question = model.getQuestionByName("country");
      expect(question).toBeDefined();
      expect(getDataListIdFromQuestion(question!)).toBe("42");
    });

    it("reads numeric property values as string ids", () => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: "dropdown",
                name: "q1",
                [DATA_LIST_PROPERTY_NAME]: 99,
              },
            ],
          },
        ],
      });

      const question = model.getQuestionByName("q1");
      expect(getDataListIdFromQuestion(question!)).toBe("99");
    });

    it("returns null for non-select questions", () => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: "text",
                name: "name",
                [DATA_LIST_PROPERTY_NAME]: "42",
              },
            ],
          },
        ],
      });

      expect(getDataListIdFromQuestion(model.getQuestionByName("name")!)).toBe(
        null,
      );
    });

    it("returns null for matrix questions even with property in JSON", () => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: "matrix",
                name: "grid",
                columns: [{ value: 1, text: "A" }],
                rows: [{ value: "r1", text: "Row" }],
                [DATA_LIST_PROPERTY_NAME]: "42",
              },
            ],
          },
        ],
      });

      const question = model.getQuestionByName("grid") as QuestionMatrixModel;
      expect(question).toBeInstanceOf(QuestionMatrixModel);
      expect(getDataListIdFromQuestion(question)).toBeNull();
    });
  });

  describe("getDataListAnswerValues", () => {
    it("returns empty array when value is null or undefined", () => {
      const model = new Model({
        pages: [
          {
            elements: [{ type: "dropdown", name: "country" }],
          },
        ],
      });

      const question = model.getQuestionByName("country")!;

      question.value = null;
      expect(getDataListAnswerValues(question)).toEqual([]);

      question.value = undefined;
      expect(getDataListAnswerValues(question)).toEqual([]);
    });

    it("returns empty array when dropdown value is empty string", () => {
      const model = new Model({
        pages: [
          {
            elements: [{ type: "dropdown", name: "country" }],
          },
        ],
      });

      const question = model.getQuestionByName("country")!;
      question.value = "";

      expect(getDataListAnswerValues(question)).toEqual([]);
    });

    it("wraps a single dropdown value in an array", () => {
      const model = new Model({
        pages: [
          {
            elements: [{ type: "dropdown", name: "country" }],
          },
        ],
      });

      const question = model.getQuestionByName("country")!;
      question.value = "us";

      expect(getDataListAnswerValues(question)).toEqual(["us"]);
    });

    it("returns tagbox multi-select values without wrapping", () => {
      const model = new Model({
        pages: [
          {
            elements: [{ type: "tagbox", name: "tags" }],
          },
        ],
      });

      const question = model.getQuestionByName("tags")!;
      question.value = ["a", "b"];

      const values = getDataListAnswerValues(question);
      expect(Array.isArray(values)).toBe(true);
      expect(values).toBe(question.value);
      expect([...values]).toEqual(["a", "b"]);
    });

    it("wraps non-array scalar values such as numbers", () => {
      const model = new Model({
        pages: [
          {
            elements: [{ type: "dropdown", name: "rating" }],
          },
        ],
      });

      const question = model.getQuestionByName("rating")!;
      question.value = 42;

      expect(getDataListAnswerValues(question)).toEqual([42]);
    });
  });
});
