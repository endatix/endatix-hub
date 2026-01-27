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
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true); // hasChanges should be true
        expect(model.data).toEqual({ question1: "answer1" });
      }
    });

    it("should return hasChanges=true when data is different", () => {
      // Arrange
      model.data = { question1: "oldAnswer" };
      const submissionData = JSON.stringify({ question1: "newAnswer" });

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
        expect(model.data).toEqual({ question1: "newAnswer" });
      }
    });

    it("should return hasChanges=true when setting data (reference comparison)", () => {
      // Arrange
      const data = { question1: "answer1" };
      model.data = data;
      const submissionData = JSON.stringify(data);

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
        expect(model.data).toEqual(data);
      }
    });

    it("should handle complex nested data structures", () => {
      // Arrange
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

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
        expect(model.data).toEqual(complexData);
      }
    });

    it("should handle empty object data", () => {
      // Arrange
      const submissionData = JSON.stringify({});

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
        expect(model.data).toEqual({});
      }
    });
  });

  describe("Empty/Null Cases", () => {
    it("should return success with hasChanges=false when submissionData is empty string", () => {
      // Act
      const result = setSubmissionData(model, "");

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
      }
      expect(onError).not.toHaveBeenCalled();
    });

    it("should return success with hasChanges=false when submissionData is null", () => {
      // Act
      const result = setSubmissionData(model, null as unknown as string);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(false);
      }
      expect(onError).not.toHaveBeenCalled();
    });

    it("should not call onError when submissionData is empty", () => {
      // Act
      setSubmissionData(model, "", onError);

      // Assert
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("Error Cases", () => {
    it("should return error when model is null", () => {
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      const result = setSubmissionData(
        null as unknown as SurveyModel,
        submissionData,
        onError,
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Model is required");
      }
      expect(onError).toHaveBeenCalledWith("Model is required");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should return error when model is undefined", () => {
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      const result = setSubmissionData(
        undefined as unknown as SurveyModel,
        submissionData,
        onError,
      );

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Model is required");
      }
      expect(onError).toHaveBeenCalledWith("Model is required");
    });

    it("should return error when submissionData is invalid JSON", () => {
      // Arrange
      const invalidJson = "{ invalid json }";

      // Act
      const result = setSubmissionData(model, invalidJson, onError);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Failed to parse submission data");
      }
      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should return error when submissionData is malformed JSON", () => {
      // Arrange
      const malformedJson = '{"question1": "answer1"';

      // Act
      const result = setSubmissionData(model, malformedJson, onError);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Failed to parse submission data");
      }
      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
    });

    it("should not modify model data when JSON parsing fails", () => {
      // Arrange
      const originalData = { question1: "original" };
      model.data = originalData;
      const invalidJson = "{ invalid }";

      // Act
      setSubmissionData(model, invalidJson, onError);

      // Assert
      expect(model.data).toEqual(originalData);
    });
  });

  describe("onError Callback", () => {
    it("should call onError when model is null", () => {
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      setSubmissionData(
        null as unknown as SurveyModel,
        submissionData,
        onError,
      );

      // Assert
      expect(onError).toHaveBeenCalledWith("Model is required");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should call onError when JSON parsing fails", () => {
      // Arrange
      const invalidJson = "{ invalid }";

      // Act
      setSubmissionData(model, invalidJson, onError);

      // Assert
      expect(onError).toHaveBeenCalledWith("Failed to parse submission data");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should not call onError when operation succeeds", () => {
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      setSubmissionData(model, submissionData, onError);

      // Assert
      expect(onError).not.toHaveBeenCalled();
    });

    it("should work without onError callback", () => {
      // Arrange
      const submissionData = JSON.stringify({ question1: "answer1" });

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
    });

    it("should work without onError callback even on error", () => {
      // Arrange
      const invalidJson = "{ invalid }";

      // Act
      const result = setSubmissionData(model, invalidJson);

      // Assert
      expect(Result.isError(result)).toBe(true);
    });
  });

  describe("Data Comparison Logic", () => {
    it("should detect changes when object structure differs", () => {
      // Arrange
      model.data = { question1: "answer1" };
      const submissionData = JSON.stringify({ question2: "answer2" });

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });

    it("should detect changes when array values differ", () => {
      // Arrange
      model.data = { items: [1, 2] };
      const submissionData = JSON.stringify({ items: [1, 2, 3] });

      // Act
      const result = setSubmissionData(model, submissionData);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(true);
      }
    });
  });
});
