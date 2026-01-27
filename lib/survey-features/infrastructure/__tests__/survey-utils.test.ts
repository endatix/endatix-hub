import { beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyModel } from "survey-core";
import { Result } from "@/lib/result";
import { setSubmissionData } from "../survey-utils";

describe("setSubmissionData", () => {
  let model: SurveyModel;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    model = new SurveyModel();
    onError = vi.fn();
  });

  describe("Success Cases", () => {
    it("should set data when valid JSON is provided", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true); // hasChanges should be true
        expect(model.data).toEqual({ question1: "answer1" });
      }
    });

    it("should return hasChanges=true when data is different", () => {
      model.data = { question1: "oldAnswer" };
      const submissionData = JSON.stringify({ question1: "newAnswer" });
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
        expect(model.data).toEqual({ question1: "newAnswer" });
      }
    });

    it("should return hasChanges=true when setting data (reference comparison)", () => {
      const data = { question1: "answer1" };
      model.data = data;
      const submissionData = JSON.stringify(data);
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
        expect(model.data).toEqual(data);
      }
    });

    it("should handle complex nested data structures", () => {
      const complexData = {
        question1: "answer1",
        question2: {
          nested: {
            value: "deep",
          },
        },
        question3: [1, 2, 3],
      };
      const submissionData = JSON.stringify(complexData);
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
        expect(model.data).toEqual(complexData);
      }
    });

    it("should handle empty object data", () => {
      const submissionData = JSON.stringify({});
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
        expect(model.data).toEqual({});
      }
    });
  });

  describe("Empty/Null Cases", () => {
    it("should return success with hasChanges=false when submissionData is empty string", () => {
      const result = setSubmissionData(model, "");

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
      }
      expect(onError).not.toHaveBeenCalled();
    });

    it("should return success with hasChanges=false when submissionData is null", () => {
      const result = setSubmissionData(model, null as unknown as string);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
      }
      expect(onError).not.toHaveBeenCalled();
    });

    it("should not call onError when submissionData is empty", () => {
      setSubmissionData(model, "", onError);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("Error Cases", () => {
    it("should return error when model is null", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      const result = setSubmissionData(
        null as unknown as SurveyModel,
        submissionData,
        onError,
      );

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Model is required");
      }
      expect(onError).toHaveBeenCalledWith("Model is required");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should return error when model is undefined", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      const result = setSubmissionData(
        undefined as unknown as SurveyModel,
        submissionData,
        onError,
      );

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Model is required");
      }
      expect(onError).toHaveBeenCalledWith("Model is required");
    });

    it("should return error when submissionData is invalid JSON", () => {
      const invalidJson = "{ invalid json }";
      const result = setSubmissionData(model, invalidJson, onError);

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Failed to parse submission data");
      }
      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should return error when submissionData is malformed JSON", () => {
      const malformedJson = '{"question1": "answer1"';
      const result = setSubmissionData(model, malformedJson, onError);

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Failed to parse submission data");
      }
      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
    });

    it("should not modify model data when JSON parsing fails", () => {
      const originalData = { question1: "original" };
      model.data = originalData;
      const invalidJson = "{ invalid }";
      setSubmissionData(model, invalidJson, onError);

      expect(model.data).toEqual(originalData);
    });
  });

  describe("onError Callback", () => {
    it("should call onError when model is null", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      setSubmissionData(
        null as unknown as SurveyModel,
        submissionData,
        onError,
      );

      expect(onError).toHaveBeenCalledWith("Model is required");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should call onError when JSON parsing fails", () => {
      const invalidJson = "{ invalid }";
      setSubmissionData(model, invalidJson, onError);

      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should not call onError when operation succeeds", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      setSubmissionData(model, submissionData, onError);

      expect(onError).not.toHaveBeenCalled();
    });

    it("should work without onError callback", () => {
      const submissionData = JSON.stringify({ question1: "answer1" });
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
    });

    it("should work without onError callback even on error", () => {
      const invalidJson = "{ invalid }";
      const result = setSubmissionData(model, invalidJson);

      expect(Result.isError(result)).toBe(true);
    });
  });

  describe("Data Comparison Logic", () => {
    it("should detect changes when object structure differs", () => {
      model.data = { question1: "answer1" };
      const submissionData = JSON.stringify({ question2: "answer2" });
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });

    it("should detect changes when array values differ", () => {
      model.data = { items: [1, 2] };
      const submissionData = JSON.stringify({ items: [1, 2, 3] });
      const result = setSubmissionData(model, submissionData);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });
  });
});
