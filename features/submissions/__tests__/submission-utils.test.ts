import { Question } from "survey-core";
import { describe, expect, it } from "vitest";
import {
  getMaskedValue,
  getQuestionNumber,
  isSensitiveVariableName,
} from "../submission-utils";

describe("submission-utils", () => {
  describe("isSensitiveVariableName", () => {
    it("should return false for empty string", () => {
      expect(isSensitiveVariableName("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isSensitiveVariableName(null as any)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isSensitiveVariableName(undefined as any)).toBe(false);
    });

    it("should return true for 'secret' variable", () => {
      expect(isSensitiveVariableName("secret")).toBe(true);
    });

    it("should return true for 'key' variable", () => {
      expect(isSensitiveVariableName("apiKey")).toBe(true);
    });

    it("should return true for 'password' variable", () => {
      expect(isSensitiveVariableName("myPassword")).toBe(true);
    });

    it("should return true for 'token' variable", () => {
      expect(isSensitiveVariableName("authToken")).toBe(true);
    });

    it("should return true for 'pass' variable", () => {
      expect(isSensitiveVariableName("passcode")).toBe(true);
    });

    it("should return true for 'hash' variable", () => {
      expect(isSensitiveVariableName("passwordHash")).toBe(true);
    });

    it("should return true for 'email' variable", () => {
      expect(isSensitiveVariableName("userEmail")).toBe(true);
    });

    it("should return true for 'phone' variable", () => {
      expect(isSensitiveVariableName("phoneNumber")).toBe(true);
    });

    it("should return false for non-sensitive variable names", () => {
      expect(isSensitiveVariableName("firstName")).toBe(false);
      expect(isSensitiveVariableName("age")).toBe(false);
      expect(isSensitiveVariableName("address")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isSensitiveVariableName("SECRET")).toBe(true);
      expect(isSensitiveVariableName("PASSWORD")).toBe(true);
      expect(isSensitiveVariableName("Token")).toBe(true);
    });
  });

  describe("getMaskedValue", () => {
    it("should return fixed length masked value", () => {
      const result = getMaskedValue("anyValue");
      expect(result).toBe("••••••••");
      expect(result.length).toBe(8);
    });

    it("should ignore the input value and return consistent mask", () => {
      expect(getMaskedValue("short")).toBe("••••••••");
      expect(getMaskedValue("aVeryLongValueThatShouldBeMasked")).toBe(
        "••••••••",
      );
      expect(getMaskedValue("")).toBe("••••••••");
    });
  });

  describe("getQuestionNumber", () => {
    const createQuestionWithNo = (noValue: string): Question => {
      const question = new Question("test");
      Object.defineProperty(question, "no", {
        get: () => noValue,
        configurable: true,
      });
      return question;
    };

    it("should return NO_NUMBER_VALUE for null question", () => {
      expect(getQuestionNumber(null as any)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE for undefined question", () => {
      expect(getQuestionNumber(undefined)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE when question has no number property", () => {
      const question = new Question("test");
      expect(getQuestionNumber(question)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE when question.no is empty string", () => {
      const question = createQuestionWithNo("");
      expect(getQuestionNumber(question)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE when question.no is not a number", () => {
      const question = createQuestionWithNo("abc");
      expect(getQuestionNumber(question)).toBe(-1);
    });

    it("should return parsed number for question with number", () => {
      const question = createQuestionWithNo("2");
      expect(getQuestionNumber(question)).toBe(2);
    });

    it("should return parsed number for question with number and period", () => {
      const question = createQuestionWithNo("2.");
      expect(getQuestionNumber(question)).toBe(2);
    });

    it("should return parsed number for larger numbers", () => {
      const question = createQuestionWithNo("10");
      expect(getQuestionNumber(question)).toBe(10);
    });

    it("should return NO_NUMBER_VALUE when question.showNumber is false", () => {
      const question = new Question("test");
      (question as any).showNumber = false;
      expect(getQuestionNumber(question)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE when question is not visible in survey", () => {
      const question = new Question("test");
      Object.defineProperty(question, "isVisibleInSurvey", {
        get: () => false,
        configurable: true,
      });
      expect(getQuestionNumber(question)).toBe(-1);
    });

    it("should return NO_NUMBER_VALUE when question.showTitle is false", () => {
      const question = new Question("test");
      (question as any).showTitle = false;
      expect(getQuestionNumber(question)).toBe(-1);
    });
  });
});
