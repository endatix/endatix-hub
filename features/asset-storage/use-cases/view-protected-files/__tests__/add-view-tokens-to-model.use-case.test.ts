import { Result } from "@/lib/result";
import { Model, QuestionFileModel, QuestionImageModel, QuestionSignaturePadModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addViewTokensToModelUseCase } from "../add-view-tokens-to-model.use-case";
import {
  createNestedElementsModel,
  nestedElementsExpectedUrls,
} from "./test-utils";

// Mock dependencies
vi.mock("../../../infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(),
}));

vi.mock("../generate-granular-read-tokens.use-case", () => ({
  generateGranularReadTokensUseCase: vi.fn(),
}));

vi.mock("../generate-assets-manifest", () => ({
  generateAssetsManifest: vi.fn(),
}));

import { getStorageConfig } from "../../../infrastructure/storage-config";
import { generateAssetsManifest } from "../generate-assets-manifest";
import { generateGranularReadTokensUseCase } from "../generate-granular-read-tokens.use-case";

describe("addViewTokensToModelUseCase", () => {
  const mockStorageConfig = {
    isEnabled: true,
    isPrivate: true,
    accountName: "testaccount",
    accountKey: "testkey",
    hostName: "testaccount.blob.core.windows.net",
    sasReadExpiryMinutes: 15,
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  };

  let mockModel: Model;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStorageConfig).mockReturnValue(mockStorageConfig as any);

    // Create a fresh model for each test
    mockModel = new Model({
      pages: [
        {
          name: "page1",
          elements: [],
        },
      ],
    });
  });

  describe("storage configuration checks", () => {
    it("should return early when storage is not enabled", async () => {
      vi.mocked(getStorageConfig).mockReturnValue({
        ...mockStorageConfig,
        isEnabled: false,
      } as any);

      await addViewTokensToModelUseCase(mockModel);

      expect(generateAssetsManifest).not.toHaveBeenCalled();
      expect(generateGranularReadTokensUseCase).not.toHaveBeenCalled();
    });

    it("should return early when storage is not private", async () => {
      vi.mocked(getStorageConfig).mockReturnValue({
        ...mockStorageConfig,
        isPrivate: false,
      } as any);

      await addViewTokensToModelUseCase(mockModel);

      expect(generateAssetsManifest).not.toHaveBeenCalled();
      expect(generateGranularReadTokensUseCase).not.toHaveBeenCalled();
    });
  });

  describe("asset manifest generation", () => {
    it("should return early when manifest is empty", async () => {
      vi.mocked(generateAssetsManifest).mockReturnValue([]);

      await addViewTokensToModelUseCase(mockModel);

      expect(generateAssetsManifest).toHaveBeenCalledWith(mockModel);
      expect(generateGranularReadTokensUseCase).not.toHaveBeenCalled();
    });

    it("should call generateGranularReadTokensUseCase with manifest URLs", async () => {
      const manifestUrls = [
        "https://testaccount.blob.core.windows.net/content/file1.jpg",
        "https://testaccount.blob.core.windows.net/user-files/file2.pdf",
      ];

      vi.mocked(generateAssetsManifest).mockReturnValue(manifestUrls);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({}),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(generateAssetsManifest).toHaveBeenCalledWith(mockModel);
      expect(generateGranularReadTokensUseCase).toHaveBeenCalledWith(manifestUrls);
    });
  });

  describe("token application", () => {
    it("should apply tokens to model logo", async () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      mockModel.logo = logoUrl;

      vi.mocked(generateAssetsManifest).mockReturnValue([logoUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [logoUrl]: "logo-token-123",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(mockModel.logo).toBe(`${logoUrl}?logo-token-123`);
    });

    it("should apply tokens to model backgroundImage", async () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/bg.jpg";
      mockModel.backgroundImage = bgUrl;

      vi.mocked(generateAssetsManifest).mockReturnValue([bgUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [bgUrl]: "bg-token-456",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(mockModel.backgroundImage).toBe(`${bgUrl}?bg-token-456`);
    });

    it("should not modify logo when token is missing", async () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      mockModel.logo = logoUrl;

      vi.mocked(generateAssetsManifest).mockReturnValue([logoUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          // logoUrl is missing from tokens
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(mockModel.logo).toBe(logoUrl);
    });

    it("should apply tokens to file question values", async () => {
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
      const fileQuestion = {
        getType: () => "file",
        value: [
          {
            name: "document.pdf",
            type: "application/pdf",
            content: fileUrl,
          },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([fileUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [fileUrl]: "file-token-789",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(fileQuestion.value[0].content).toBe(`${fileUrl}?file-token-789`);
    });

    it("should apply tokens to multiple files in file question", async () => {
      const fileUrl1 = "https://testaccount.blob.core.windows.net/user-files/file1.pdf";
      const fileUrl2 = "https://testaccount.blob.core.windows.net/user-files/file2.jpg";
      const fileQuestion = {
        getType: () => "file",
        value: [
          { name: "file1.pdf", type: "application/pdf", content: fileUrl1 },
          { name: "file2.jpg", type: "image/jpeg", content: fileUrl2 },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([fileUrl1, fileUrl2]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [fileUrl1]: "token1",
          [fileUrl2]: "token2",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(fileQuestion.value[0].content).toBe(`${fileUrl1}?token1`);
      expect(fileQuestion.value[1].content).toBe(`${fileUrl2}?token2`);
    });

    it("should apply tokens to signature pad backgroundImage and value", async () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const sigUrl = "https://testaccount.blob.core.windows.net/user-files/signature.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: sigUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([bgUrl, sigUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [bgUrl]: "bg-token",
          [sigUrl]: "sig-token",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(sigQuestion.backgroundImage).toBe(`${bgUrl}?bg-token`);
      expect(sigQuestion.value).toBe(`${sigUrl}?sig-token`);
    });

    it("should handle signature pad with data URL value (not storage URL)", async () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: dataUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([bgUrl, dataUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [bgUrl]: "bg-token",
          // dataUrl won't have a token since it's not a storage URL
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(sigQuestion.backgroundImage).toBe(`${bgUrl}?bg-token`);
      expect(sigQuestion.value).toBe(dataUrl); // Should remain unchanged
    });

    it("should apply tokens to image question imageLink", async () => {
      const imageUrl = "https://testaccount.blob.core.windows.net/content/image.jpg";
      const imageQuestion = {
        getType: () => "image",
        imageLink: imageUrl,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([imageQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([imageUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [imageUrl]: "image-token",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(imageQuestion.imageLink).toBe(`${imageUrl}?image-token`);
    });

    it("should handle audio recorder question type", async () => {
      const audioUrl = "https://testaccount.blob.core.windows.net/user-files/audio.wav";
      const audioQuestion = {
        getType: () => "audiorecorder",
        value: [
          {
            name: "audio.wav",
            type: "audio/wav",
            content: audioUrl,
          },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([audioQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([audioUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [audioUrl]: "audio-token",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(audioQuestion.value[0].content).toBe(`${audioUrl}?audio-token`);
    });

    it("should skip questions without matching tokens", async () => {
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/file.pdf";
      const fileQuestion = {
        getType: () => "file",
        value: [
          {
            name: "file.pdf",
            type: "application/pdf",
            content: fileUrl,
          },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([fileUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          // fileUrl is missing from tokens
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(fileQuestion.value[0].content).toBe(fileUrl);
    });

    it("should handle file question with non-array value", async () => {
      const fileQuestion = {
        getType: () => "file",
        value: null, // Not an array
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({}),
      );

      await addViewTokensToModelUseCase(mockModel);

      // Should not throw and should handle gracefully
      expect(fileQuestion.value).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should not apply tokens when generateGranularReadTokensUseCase fails", async () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      mockModel.logo = logoUrl;

      vi.mocked(generateAssetsManifest).mockReturnValue([logoUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.error("Failed to generate tokens"),
      );

      await addViewTokensToModelUseCase(mockModel);

      // Logo should remain unchanged
      expect(mockModel.logo).toBe(logoUrl);
    });

    it("should handle URLs with existing query parameters", async () => {
      const urlWithQuery = "https://testaccount.blob.core.windows.net/content/file.jpg?existing=param";
      mockModel.logo = urlWithQuery;

      vi.mocked(generateAssetsManifest).mockReturnValue([urlWithQuery]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [urlWithQuery]: "token123",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      // Should append token with & separator
      expect(mockModel.logo).toBe(`${urlWithQuery}&token123`);
    });
  });

  describe("complex scenarios", () => {
    it("should handle model with multiple question types", async () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/file.pdf";
      const imageUrl = "https://testaccount.blob.core.windows.net/content/image.jpg";
      const sigBgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";

      mockModel.logo = logoUrl;

      const fileQuestion = {
        getType: () => "file",
        value: [{ name: "file.pdf", type: "application/pdf", content: fileUrl }],
      } as unknown as QuestionFileModel;

      const imageQuestion = {
        getType: () => "image",
        imageLink: imageUrl,
      } as unknown as QuestionImageModel;

      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: sigBgUrl,
        value: "data:image/png;base64,...",
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion, imageQuestion, sigQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([logoUrl, fileUrl, imageUrl, sigBgUrl]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [logoUrl]: "logo-token",
          [fileUrl]: "file-token",
          [imageUrl]: "image-token",
          [sigBgUrl]: "sig-bg-token",
        }),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(mockModel.logo).toBe(`${logoUrl}?logo-token`);
      expect(fileQuestion.value[0].content).toBe(`${fileUrl}?file-token`);
      expect(imageQuestion.imageLink).toBe(`${imageUrl}?image-token`);
      expect(sigQuestion.backgroundImage).toBe(`${sigBgUrl}?sig-bg-token`);
    });

    it("should handle questions with no value", async () => {
      const fileQuestion = {
        getType: () => "file",
        value: [], // Empty array
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({}),
      );

      await addViewTokensToModelUseCase(mockModel);

      expect(fileQuestion.value).toEqual([]);
    });

    it("should handle files with missing content property", async () => {
      const fileQuestion = {
        getType: () => "file",
        value: [
          {
            name: "file.pdf",
            type: "application/pdf",
            // content is missing
          },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      vi.mocked(generateAssetsManifest).mockReturnValue([]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({}),
      );

      await addViewTokensToModelUseCase(mockModel);

      // Should not throw and should handle gracefully
      expect(fileQuestion.value[0].content).toBeUndefined();
    });
  });

  describe("nested elements", () => {
    it("should apply tokens to nested image questions in panels", async () => {
      const nestedModel = createNestedElementsModel();
      const imageUrl1 = nestedElementsExpectedUrls[0];
      const imageUrl2 = nestedElementsExpectedUrls[1];

      vi.mocked(generateAssetsManifest).mockReturnValue([
        imageUrl1,
        imageUrl2,
      ]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [imageUrl1]: "token1",
          [imageUrl2]: "token2",
        }),
      );

      await addViewTokensToModelUseCase(nestedModel);

      // Verify tokens were applied to nested image questions
      const allQuestions = nestedModel.getAllQuestions(true, true, true);
      const imageQuestions = allQuestions.filter(
        (q) => q.getType() === "image",
      );

      expect(imageQuestions.length).toBeGreaterThanOrEqual(2);

      // Check that imageLink properties were updated with tokens
      const imageQuestion1 = imageQuestions.find(
        (q) => (q as QuestionImageModel).imageLink?.includes(imageUrl1),
      ) as QuestionImageModel;
      const imageQuestion2 = imageQuestions.find(
        (q) => (q as QuestionImageModel).imageLink?.includes(imageUrl2),
      ) as QuestionImageModel;

      expect(imageQuestion1?.imageLink).toBe(`${imageUrl1}?token1`);
      expect(imageQuestion2?.imageLink).toBe(`${imageUrl2}?token2`);
    });

    it("should handle nested elements with missing tokens gracefully", async () => {
      const nestedModel = createNestedElementsModel();
      const imageUrl1 = nestedElementsExpectedUrls[0];
      const imageUrl2 = nestedElementsExpectedUrls[1];

      vi.mocked(generateAssetsManifest).mockReturnValue([
        imageUrl1,
        imageUrl2,
      ]);
      vi.mocked(generateGranularReadTokensUseCase).mockResolvedValue(
        Result.success({
          [imageUrl1]: "token1",
          // imageUrl2 is missing from tokens
        }),
      );

      await addViewTokensToModelUseCase(nestedModel);

      // Verify only imageUrl1 got a token
      const allQuestions = nestedModel.getAllQuestions(true, true, true);
      const imageQuestions = allQuestions.filter(
        (q) => q.getType() === "image",
      );

      const imageQuestion1 = imageQuestions.find(
        (q) => (q as QuestionImageModel).imageLink?.includes(imageUrl1),
      ) as QuestionImageModel;
      const imageQuestion2 = imageQuestions.find(
        (q) => (q as QuestionImageModel).imageLink?.includes(imageUrl2),
      ) as QuestionImageModel;

      expect(imageQuestion1?.imageLink).toBe(`${imageUrl1}?token1`);
      expect(imageQuestion2?.imageLink).toBe(imageUrl2); // Should remain unchanged
    });
  });
});
