import { Submission } from "@/lib/endatix-api";
import { Model } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { preparePdfModel } from "../prepare-pdf-model.use-case";

// Mock dependencies
vi.mock("@/features/asset-storage/server", () => ({
  addViewTokensToModelUseCase: vi.fn(),
}));

vi.mock("@/features/submissions/submission-localization", () => ({
  getSubmissionLocale: vi.fn(),
}));

vi.mock("@/lib/questions", () => ({
  initializeCustomQuestions: vi.fn(),
}));

vi.mock("@/lib/questions/audio-recorder/audio-question-pdf", () => ({
  registerAudioQuestionModel: vi.fn(),
}));

import { addViewTokensToModelUseCase } from "@/features/asset-storage/server";
import { getSubmissionLocale } from "@/features/submissions/submission-localization";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestionModel } from "@/lib/questions/audio-recorder/audio-question-pdf";

describe("preparePdfModel", () => {
  const mockSubmission: Submission = {
    id: "submission-123",
    formId: "form-456",
    jsonData: JSON.stringify({ question1: "answer1" }),
    formDefinition: {
      id: "def-789",
      jsonData: JSON.stringify({
        pages: [
          {
            name: "page1",
            elements: [
              {
                type: "text",
                name: "question1",
                title: "Question 1",
              },
            ],
          },
        ],
      }),
    },
    metadata: JSON.stringify({ language: "en" }),
  } as Submission;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addViewTokensToModelUseCase).mockResolvedValue(undefined);
    vi.mocked(getSubmissionLocale).mockReturnValue("en");
    vi.mocked(initializeCustomQuestions).mockReturnValue(undefined);
    vi.mocked(registerAudioQuestionModel).mockReturnValue(undefined);
  });

  describe("basic model creation", () => {
    it("should create a SurveyJS Model from submission data", async () => {
      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
      });

      expect(result).toBeInstanceOf(Model);
      expect(result.data).toEqual({ question1: "answer1" });
    });

    it("should initialize custom questions", async () => {
      const customQuestions = ["custom-question-1", "custom-question-2"];

      await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: customQuestions,
      });

      expect(initializeCustomQuestions).toHaveBeenCalledWith(customQuestions);
    });

    it("should register audio question model", async () => {
      await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
      });

      expect(registerAudioQuestionModel).toHaveBeenCalledTimes(1);
    });

    it("should authorize assets by calling addViewTokensToModelUseCase", async () => {
      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
      });

      expect(addViewTokensToModelUseCase).toHaveBeenCalledTimes(1);
      expect(addViewTokensToModelUseCase).toHaveBeenCalledWith(result);
    });
  });

  describe("locale handling", () => {
    it("should set locale from submission metadata when useDefaultLocale is false", async () => {
      vi.mocked(getSubmissionLocale).mockReturnValue("fr");

      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
        useDefaultLocale: false,
      });

      expect(getSubmissionLocale).toHaveBeenCalledWith(mockSubmission);
      expect(result.locale).toBe("fr");
    });

    it("should not set locale when useDefaultLocale is true", async () => {
      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
        useDefaultLocale: true,
      });

      expect(getSubmissionLocale).not.toHaveBeenCalled();
      // SurveyJS Model may default to empty string, so check for falsy value
      expect(result.locale).toBeFalsy();
    });

    it("should not set locale when getSubmissionLocale returns undefined", async () => {
      vi.mocked(getSubmissionLocale).mockReturnValue(undefined);

      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
        useDefaultLocale: false,
      });

      expect(getSubmissionLocale).toHaveBeenCalledWith(mockSubmission);
      // SurveyJS Model may default to empty string, so check for falsy value
      expect(result.locale).toBeFalsy();
    });

    it("should default useDefaultLocale to false", async () => {
      vi.mocked(getSubmissionLocale).mockReturnValue("de");

      const result = await preparePdfModel({
        submission: mockSubmission,
        customQuestionsJsonData: [],
      });

      expect(getSubmissionLocale).toHaveBeenCalledWith(mockSubmission);
      expect(result.locale).toBe("de");
    });
  });

  describe("edge cases", () => {
    it("should handle missing formDefinition", async () => {
      const submissionWithoutDefinition: Submission = {
        ...mockSubmission,
        formDefinition: undefined,
      };

      const result = await preparePdfModel({
        submission: submissionWithoutDefinition,
        customQuestionsJsonData: [],
      });

      expect(result).toBeInstanceOf(Model);
      expect(result.data).toEqual({ question1: "answer1" });
    });

    it("should handle missing formDefinition.jsonData", async () => {
      const submissionWithoutJsonData: Submission = {
        ...mockSubmission,
        formDefinition: {
          ...mockSubmission.formDefinition!,
          jsonData: undefined,
        },
      };

      const result = await preparePdfModel({
        submission: submissionWithoutJsonData,
        customQuestionsJsonData: [],
      });

      expect(result).toBeInstanceOf(Model);
      expect(result.data).toEqual({ question1: "answer1" });
    });

    it("should handle missing submission jsonData", async () => {
      const submissionWithoutData: Submission = {
        ...mockSubmission,
        jsonData: undefined,
      };

      const result = await preparePdfModel({
        submission: submissionWithoutData,
        customQuestionsJsonData: [],
      });

      expect(result).toBeInstanceOf(Model);
      expect(result.data).toEqual({});
    });

    it("should handle empty jsonData strings by throwing error", async () => {
      const submissionWithEmptyData: Submission = {
        ...mockSubmission,
        jsonData: "",
      };

      // Empty string is not valid JSON, so it should throw
      await expect(
        preparePdfModel({
          submission: submissionWithEmptyData,
          customQuestionsJsonData: [],
        }),
      ).rejects.toThrow();
    });

    it("should handle empty formDefinition jsonData by throwing error", async () => {
      const submissionWithEmptyDefinition: Submission = {
        ...mockSubmission,
        formDefinition: {
          ...mockSubmission.formDefinition!,
          jsonData: "",
        },
      };

      // Empty string is not valid JSON, so it should throw
      await expect(
        preparePdfModel({
          submission: submissionWithEmptyDefinition,
          customQuestionsJsonData: [],
        }),
      ).rejects.toThrow();
    });

    it("should handle invalid JSON in submission jsonData gracefully", async () => {
      const submissionWithInvalidJson: Submission = {
        ...mockSubmission,
        jsonData: "invalid json{",
      };

      await expect(
        preparePdfModel({
          submission: submissionWithInvalidJson,
          customQuestionsJsonData: [],
        }),
      ).rejects.toThrow();
    });

    it("should handle invalid JSON in formDefinition jsonData gracefully", async () => {
      const submissionWithInvalidDefinition: Submission = {
        ...mockSubmission,
        formDefinition: {
          ...mockSubmission.formDefinition!,
          jsonData: "invalid json{",
        },
      };

      await expect(
        preparePdfModel({
          submission: submissionWithInvalidDefinition,
          customQuestionsJsonData: [],
        }),
      ).rejects.toThrow();
    });
  });
});
