import { Model, QuestionFileModel, QuestionImageModel, QuestionSignaturePadModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAssetsManifest } from "../generate-assets-manifest";
import {
  createNestedElementsModel,
  nestedElementsExpectedUrls,
} from "./test-utils";

describe("generateAssetsManifest", () => {
  let mockModel: Model;

  beforeEach(() => {
    mockModel = new Model({
      pages: [
        {
          name: "page1",
          elements: [],
        },
      ],
    });
  });

  describe("model-level properties", () => {
    it("should include logo URL when present", () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      mockModel.logo = logoUrl;

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(logoUrl);
      expect(result.length).toBe(1);
    });

    it("should include backgroundImage URL when present", () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/bg.jpg";
      mockModel.backgroundImage = bgUrl;

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(bgUrl);
      expect(result.length).toBe(1);
    });

    it("should include both logo and backgroundImage when both are present", () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      const bgUrl = "https://testaccount.blob.core.windows.net/content/bg.jpg";
      mockModel.logo = logoUrl;
      mockModel.backgroundImage = bgUrl;

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(logoUrl);
      expect(result).toContain(bgUrl);
      expect(result.length).toBe(2);
    });

    it("should return empty array when logo and backgroundImage are not set", () => {
      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });

    it("should skip empty string logo", () => {
      mockModel.logo = "";

      const result = generateAssetsManifest(mockModel);

      expect(result).not.toContain("");
      expect(result.length).toBe(0);
    });
  });

  describe("file question type", () => {
    it("should extract URLs from file question with single file", () => {
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

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(fileUrl);
      expect(result.length).toBe(1);
    });

    it("should extract URLs from file question with multiple files", () => {
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

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(fileUrl1);
      expect(result).toContain(fileUrl2);
      expect(result.length).toBe(2);
    });

    it("should skip files without content property", () => {
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
      const fileQuestion = {
        getType: () => "file",
        value: [
          {
            name: "document.pdf",
            type: "application/pdf",
            // content is missing
          },
          {
            name: "document2.pdf",
            type: "application/pdf",
            content: fileUrl,
          },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(fileUrl);
      expect(result.length).toBe(1);
    });

    it("should handle file question with empty array value", () => {
      const fileQuestion = {
        getType: () => "file",
        value: [],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });

    it("should handle file question with null value", () => {
      const fileQuestion = {
        getType: () => "file",
        value: null,
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });

    it("should handle file question with non-array value", () => {
      const fileQuestion = {
        getType: () => "file",
        value: "not-an-array",
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });
  });

  describe("audiorecorder question type", () => {
    it("should extract URLs from audiorecorder question", () => {
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

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(audioUrl);
      expect(result.length).toBe(1);
    });

    it("should extract URLs from audiorecorder question with multiple files", () => {
      const audioUrl1 = "https://testaccount.blob.core.windows.net/user-files/audio1.wav";
      const audioUrl2 = "https://testaccount.blob.core.windows.net/user-files/audio2.mp3";
      const audioQuestion = {
        getType: () => "audiorecorder",
        value: [
          { name: "audio1.wav", type: "audio/wav", content: audioUrl1 },
          { name: "audio2.mp3", type: "audio/mpeg", content: audioUrl2 },
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([audioQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(audioUrl1);
      expect(result).toContain(audioUrl2);
      expect(result.length).toBe(2);
    });
  });

  describe("signaturepad question type", () => {
    it("should extract backgroundImage URL from signature pad question", () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: null,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(bgUrl);
      expect(result.length).toBe(1);
    });

    it("should extract value URL from signature pad question when value is a string", () => {
      const sigUrl = "https://testaccount.blob.core.windows.net/user-files/signature.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: null,
        value: sigUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(sigUrl);
      expect(result.length).toBe(1);
    });

    it("should extract both backgroundImage and value URLs from signature pad question", () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const sigUrl = "https://testaccount.blob.core.windows.net/user-files/signature.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: sigUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(bgUrl);
      expect(result).toContain(sigUrl);
      expect(result.length).toBe(2);
    });

    it("should handle signature pad with data URL value", () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: dataUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(bgUrl);
      expect(result).toContain(dataUrl);
      expect(result.length).toBe(2);
    });

    it("should handle signature pad with non-string value", () => {
      const bgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: bgUrl,
        value: { someObject: "value" },
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(bgUrl);
      expect(result.length).toBe(1);
    });

    it("should handle signature pad with null backgroundImage", () => {
      const sigUrl = "https://testaccount.blob.core.windows.net/user-files/signature.png";
      const sigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: null,
        value: sigUrl,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([sigQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(sigUrl);
      expect(result.length).toBe(1);
    });
  });

  describe("image question type", () => {
    it("should extract imageLink URL from image question", () => {
      const imageUrl = "https://testaccount.blob.core.windows.net/content/image.jpg";
      const imageQuestion = {
        getType: () => "image",
        imageLink: imageUrl,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([imageQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(imageUrl);
      expect(result.length).toBe(1);
    });

    it("should handle image question with null imageLink", () => {
      const imageQuestion = {
        getType: () => "image",
        imageLink: null,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([imageQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });

    it("should skip image question with empty string imageLink", () => {
      const imageQuestion = {
        getType: () => "image",
        imageLink: "",
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([imageQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).not.toContain("");
      expect(result.length).toBe(0);
    });
  });

  describe("other question types", () => {
    it("should skip questions with unknown types", () => {
      const textQuestion = {
        getType: () => "text",
        value: "some text",
      } as any;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([textQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });

    it("should skip questions with no matching case in switch statement", () => {
      const dropdownQuestion = {
        getType: () => "dropdown",
        choices: ["option1", "option2"],
      } as any;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([dropdownQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });
  });

  describe("deduplication", () => {
    it("should deduplicate URLs from model-level properties", () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      mockModel.logo = logoUrl;
      mockModel.backgroundImage = logoUrl; // Same URL

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([logoUrl]);
      expect(result.length).toBe(1);
    });

    it("should deduplicate URLs from multiple file questions", () => {
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
      const fileQuestion1 = {
        getType: () => "file",
        value: [{ name: "doc1.pdf", type: "application/pdf", content: fileUrl }],
      } as unknown as QuestionFileModel;

      const fileQuestion2 = {
        getType: () => "file",
        value: [{ name: "doc2.pdf", type: "application/pdf", content: fileUrl }],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion1, fileQuestion2] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([fileUrl]);
      expect(result.length).toBe(1);
    });

    it("should deduplicate URLs across different question types", () => {
      const sharedUrl = "https://testaccount.blob.core.windows.net/content/shared.jpg";
      const fileQuestion = {
        getType: () => "file",
        value: [{ name: "file.jpg", type: "image/jpeg", content: sharedUrl }],
      } as unknown as QuestionFileModel;

      const imageQuestion = {
        getType: () => "image",
        imageLink: sharedUrl,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion, imageQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([sharedUrl]);
      expect(result.length).toBe(1);
    });

    it("should deduplicate URLs within a single file question", () => {
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/document.pdf";
      const fileQuestion = {
        getType: () => "file",
        value: [
          { name: "doc1.pdf", type: "application/pdf", content: fileUrl },
          { name: "doc2.pdf", type: "application/pdf", content: fileUrl }, // Duplicate
        ],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([fileQuestion] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([fileUrl]);
      expect(result.length).toBe(1);
    });
  });

  describe("nested elements", () => {
    it("should extract URLs from image questions nested in panels", () => {
      const imageUrl1 = "https://testaccount.blob.core.windows.net/content/image1.jpg";
      const imageUrl2 = "https://testaccount.blob.core.windows.net/content/image2.jpg";

      const topLevelImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl1,
      } as unknown as QuestionImageModel;

      const nestedImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl2,
      } as unknown as QuestionImageModel;

      // getAllQuestions(true, true, true) should return both top-level and nested questions
      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelImageQuestion,
        nestedImageQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(imageUrl1);
      expect(result).toContain(imageUrl2);
      expect(result.length).toBe(2);
    });

    it("should extract URLs from file questions nested in panels", () => {
      const fileUrl1 = "https://testaccount.blob.core.windows.net/user-files/file1.pdf";
      const fileUrl2 = "https://testaccount.blob.core.windows.net/user-files/file2.pdf";

      const topLevelFileQuestion = {
        getType: () => "file",
        value: [{ name: "file1.pdf", type: "application/pdf", content: fileUrl1 }],
      } as unknown as QuestionFileModel;

      const nestedFileQuestion = {
        getType: () => "file",
        value: [{ name: "file2.pdf", type: "application/pdf", content: fileUrl2 }],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelFileQuestion,
        nestedFileQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(fileUrl1);
      expect(result).toContain(fileUrl2);
      expect(result.length).toBe(2);
    });

    it("should extract URLs from signature pad questions nested in panels", () => {
      const sigBgUrl1 = "https://testaccount.blob.core.windows.net/content/sig-bg1.png";
      const sigUrl1 = "https://testaccount.blob.core.windows.net/user-files/sig1.png";
      const sigBgUrl2 = "https://testaccount.blob.core.windows.net/content/sig-bg2.png";
      const sigUrl2 = "https://testaccount.blob.core.windows.net/user-files/sig2.png";

      const topLevelSigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: sigBgUrl1,
        value: sigUrl1,
      } as unknown as QuestionSignaturePadModel;

      const nestedSigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: sigBgUrl2,
        value: sigUrl2,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelSigQuestion,
        nestedSigQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(sigBgUrl1);
      expect(result).toContain(sigUrl1);
      expect(result).toContain(sigBgUrl2);
      expect(result).toContain(sigUrl2);
      expect(result.length).toBe(4);
    });

    it("should extract URLs from multiple question types nested in panels", () => {
      const imageUrl = "https://testaccount.blob.core.windows.net/content/image.jpg";
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/file.pdf";
      const audioUrl = "https://testaccount.blob.core.windows.net/user-files/audio.wav";
      const sigBgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";

      const nestedImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl,
      } as unknown as QuestionImageModel;

      const nestedFileQuestion = {
        getType: () => "file",
        value: [{ name: "file.pdf", type: "application/pdf", content: fileUrl }],
      } as unknown as QuestionFileModel;

      const nestedAudioQuestion = {
        getType: () => "audiorecorder",
        value: [{ name: "audio.wav", type: "audio/wav", content: audioUrl }],
      } as unknown as QuestionFileModel;

      const nestedSigQuestion = {
        getType: () => "signaturepad",
        backgroundImage: sigBgUrl,
        value: null,
      } as unknown as QuestionSignaturePadModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        nestedImageQuestion,
        nestedFileQuestion,
        nestedAudioQuestion,
        nestedSigQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(imageUrl);
      expect(result).toContain(fileUrl);
      expect(result).toContain(audioUrl);
      expect(result).toContain(sigBgUrl);
      expect(result.length).toBe(4);
    });

    it("should handle deeply nested questions (panels within panels)", () => {
      const imageUrl1 = "https://testaccount.blob.core.windows.net/content/image1.jpg";
      const imageUrl2 = "https://testaccount.blob.core.windows.net/content/image2.jpg";
      const imageUrl3 = "https://testaccount.blob.core.windows.net/content/image3.jpg";

      const topLevelImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl1,
      } as unknown as QuestionImageModel;

      const firstLevelNestedImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl2,
      } as unknown as QuestionImageModel;

      const secondLevelNestedImageQuestion = {
        getType: () => "image",
        imageLink: imageUrl3,
      } as unknown as QuestionImageModel;

      // getAllQuestions should return all questions regardless of nesting depth
      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelImageQuestion,
        firstLevelNestedImageQuestion,
        secondLevelNestedImageQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(imageUrl1);
      expect(result).toContain(imageUrl2);
      expect(result).toContain(imageUrl3);
      expect(result.length).toBe(3);
    });

    it("should deduplicate URLs from nested and top-level questions", () => {
      const sharedUrl = "https://testaccount.blob.core.windows.net/content/shared.jpg";

      const topLevelImageQuestion = {
        getType: () => "image",
        imageLink: sharedUrl,
      } as unknown as QuestionImageModel;

      const nestedImageQuestion = {
        getType: () => "image",
        imageLink: sharedUrl,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelImageQuestion,
        nestedImageQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([sharedUrl]);
      expect(result.length).toBe(1);
    });

    it("should handle mixed nested and top-level questions with model properties", () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      const topLevelImageUrl = "https://testaccount.blob.core.windows.net/content/top-image.jpg";
      const nestedFileUrl = "https://testaccount.blob.core.windows.net/user-files/nested-file.pdf";
      const nestedImageUrl = "https://testaccount.blob.core.windows.net/content/nested-image.jpg";

      mockModel.logo = logoUrl;

      const topLevelImageQuestion = {
        getType: () => "image",
        imageLink: topLevelImageUrl,
      } as unknown as QuestionImageModel;

      const nestedFileQuestion = {
        getType: () => "file",
        value: [{ name: "file.pdf", type: "application/pdf", content: nestedFileUrl }],
      } as unknown as QuestionFileModel;

      const nestedImageQuestion = {
        getType: () => "image",
        imageLink: nestedImageUrl,
      } as unknown as QuestionImageModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        topLevelImageQuestion,
        nestedFileQuestion,
        nestedImageQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(logoUrl);
      expect(result).toContain(topLevelImageUrl);
      expect(result).toContain(nestedFileUrl);
      expect(result).toContain(nestedImageUrl);
      expect(result.length).toBe(4);
    });

    it("should extract URLs from real-world nested panel structure", () => {
      // Use the actual nested elements model from test utilities
      const nestedModel = createNestedElementsModel();
      const [topLevelImageUrl, nestedImageUrl] = nestedElementsExpectedUrls;

      const result = generateAssetsManifest(nestedModel);

      // Should discover both top-level and nested image URLs
      expect(result).toContain(topLevelImageUrl);
      expect(result).toContain(nestedImageUrl);
      expect(result.length).toBe(2);
    });
  });

  describe("complex scenarios", () => {
    it("should collect URLs from all sources", () => {
      const logoUrl = "https://testaccount.blob.core.windows.net/content/logo.png";
      const bgUrl = "https://testaccount.blob.core.windows.net/content/bg.jpg";
      const fileUrl = "https://testaccount.blob.core.windows.net/user-files/file.pdf";
      const imageUrl = "https://testaccount.blob.core.windows.net/content/image.jpg";
      const sigBgUrl = "https://testaccount.blob.core.windows.net/content/sig-bg.png";
      const sigUrl = "https://testaccount.blob.core.windows.net/user-files/signature.png";
      const audioUrl = "https://testaccount.blob.core.windows.net/user-files/audio.wav";

      mockModel.logo = logoUrl;
      mockModel.backgroundImage = bgUrl;

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
        value: sigUrl,
      } as unknown as QuestionSignaturePadModel;

      const audioQuestion = {
        getType: () => "audiorecorder",
        value: [{ name: "audio.wav", type: "audio/wav", content: audioUrl }],
      } as unknown as QuestionFileModel;

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([
        fileQuestion,
        imageQuestion,
        sigQuestion,
        audioQuestion,
      ] as any);

      const result = generateAssetsManifest(mockModel);

      expect(result).toContain(logoUrl);
      expect(result).toContain(bgUrl);
      expect(result).toContain(fileUrl);
      expect(result).toContain(imageUrl);
      expect(result).toContain(sigBgUrl);
      expect(result).toContain(sigUrl);
      expect(result).toContain(audioUrl);
      expect(result.length).toBe(7);
    });

    it("should handle model with no questions", () => {
      mockModel.logo = "https://testaccount.blob.core.windows.net/content/logo.png";

      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([]);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual(["https://testaccount.blob.core.windows.net/content/logo.png"]);
      expect(result.length).toBe(1);
    });

    it("should handle empty model", () => {
      vi.spyOn(mockModel, "getAllQuestions").mockReturnValue([]);

      const result = generateAssetsManifest(mockModel);

      expect(result).toEqual([]);
    });
  });
});
