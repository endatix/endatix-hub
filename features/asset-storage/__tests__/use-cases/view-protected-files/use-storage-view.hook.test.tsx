import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { useStorageView } from "@/features/asset-storage/client";
import {
  SurveyModel,
  AfterRenderQuestionEvent,
  AfterRenderHeaderEvent,
  QuestionImageModel,
  QuestionImagePickerModel,
  QuestionSignaturePadModel,
  QuestionFileModel,
} from "survey-core";
import { Result } from "@/lib/result";
import { ContainerReadToken, ProtectedFile } from "@/features/asset-storage/types";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";

// Mock the not-allowed image
vi.mock("@/public/assets/images/signs/not-allowed-image.svg", () => ({
  default: { src: "/not-allowed.svg" },
}));

const resolvedTokenResult = Result.success<ContainerReadToken>({
  token: "test-token-123",
  containerName: "content",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const resolvedUserFilesTokenResult = Result.success<ContainerReadToken>({
  token: "user-files-token-456",
  containerName: "user-files",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const createDefaultReadTokenPromises = () => ({
  userFiles: Promise.resolve(resolvedUserFilesTokenResult),
  content: Promise.resolve(resolvedTokenResult),
});

const mockStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "testaccount.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

describe("useStorageView", () => {
  const mockSurveyModel = {
    locale: "en",
    locLogo: {
      renderedHtml:
        "https://testaccount.blob.core.windows.net/content/logo.png",
    },
    onAfterRenderQuestion: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    onAfterRenderHeader: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  } as unknown as SurveyModel;

  const createWrapper = (
    config: typeof mockStorageConfig | null = mockStorageConfig,
    tokens?: { userFiles: Promise<typeof resolvedUserFilesTokenResult>; content: Promise<typeof resolvedTokenResult> },
  ) => {
    const defaultTokens = createDefaultReadTokenPromises();
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <AssetStorageClientProvider config={config} tokens={tokens ?? defaultTokens}>
            {children}
          </AssetStorageClientProvider>
        </Suspense>
      );
    }
    return TestWrapper;
  };

  const renderHookWithSuspense = async (
    config: typeof mockStorageConfig | null = mockStorageConfig,
  ) => {
    const props = createDefaultReadTokenPromises();
    let result: ReturnType<typeof renderHook>["result"] | undefined;

    await act(async () => {
      const view = renderHook(() => useStorageView(props), {
        wrapper: createWrapper(config, props),
      });
      result = view.result;
      await props.userFiles;
      await props.content;
      await Promise.resolve();
    });

    return {
      result: result! as { current: ReturnType<typeof useStorageView> },
      props,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hook initialization", () => {
    it("should initialize and return setModelMetadata and registerViewHandlers", async () => {
      const props = createDefaultReadTokenPromises();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(mockStorageConfig, props),
        });
        result = view.result;
        // Await promises to ensure they're processed within act
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      expect(hookResult).not.toBeNull();
      expect(hookResult.setModelMetadata).toBeDefined();
      expect(hookResult.registerViewHandlers).toBeDefined();
    });
  });

  describe("setModelMetadata", () => {
    it("should set readTokens when storage is private", async () => {
      const props = createDefaultReadTokenPromises();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(mockStorageConfig, props),
        });
        result = view.result;
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.setModelMetadata(model);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((model as any).readTokens).toEqual({
        userFiles: resolvedUserFilesTokenResult.value,
        content: resolvedTokenResult.value,
      });
    });

    it("should not set metadata when storage is not private", async () => {
      const publicConfig = { ...mockStorageConfig, isPrivate: false };
      const props = createDefaultReadTokenPromises();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(publicConfig, props),
        });
        result = view.result;
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.setModelMetadata(model);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((model as any).readTokens).toBeUndefined();
    });

    it("should not set metadata when storage config is null", async () => {
      const props = createDefaultReadTokenPromises();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(null, props),
        });
        result = view.result;
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.setModelMetadata(model);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((model as any).readTokens).toBeUndefined();
    });
  });

  describe("registerViewHandlers", () => {
    it("should register event handlers when storage is private", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      const unregister = result.current.registerViewHandlers(model);

      expect(model.onAfterRenderQuestion.add).toHaveBeenCalledTimes(1);
      expect(model.onAfterRenderHeader.add).toHaveBeenCalledTimes(1);

      unregister();

      expect(model.onAfterRenderQuestion.remove).toHaveBeenCalledTimes(1);
      expect(model.onAfterRenderHeader.remove).toHaveBeenCalledTimes(1);
    });

    it("should return no-op cleanup when storage is not private", async () => {
      const publicConfig = { ...mockStorageConfig, isPrivate: false };
      const { result } = await renderHookWithSuspense(publicConfig);

      const model = { ...mockSurveyModel } as SurveyModel;
      const unregister = result.current.registerViewHandlers(model);

      expect(model.onAfterRenderQuestion.add).not.toHaveBeenCalled();
      expect(model.onAfterRenderHeader.add).not.toHaveBeenCalled();

      // Should be safe to call
      unregister();
    });

    it("should handle image question type", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const imageQuestion = {
        getType: () => "image",
        imageLink:
          "https://testaccount.blob.core.windows.net/content/image.jpg",
      } as unknown as QuestionImageModel;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", imageQuestion.imageLink);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        question: imageQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      expect(mockImage.getAttribute("src")).toBe(
        `${imageQuestion.imageLink}?${resolvedTokenResult.value.token}`,
      );
    });

    it("should handle imagepicker question type", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      const imageLink =
        "https://testaccount.blob.core.windows.net/content/choice.jpg";
      mockImage.setAttribute("src", imageLink);
      mockHtmlElement.appendChild(mockImage);

      const imagePickerQuestion = {
        getType: () => "imagepicker",
        choices: [
          { imageLink },
          { imageLink: "https://other.com/image.jpg" }, // Should be ignored
        ],
      } as unknown as QuestionImagePickerModel;

      const event = {
        question: imagePickerQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      expect(mockImage.getAttribute("src")).toBe(
        `${imageLink}?${resolvedTokenResult.value.token}`,
      );
    });

    it("should handle signaturepad question type", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const signatureQuestion = {
        getType: () => "signaturepad",
        backgroundImage:
          "https://testaccount.blob.core.windows.net/content/signature-bg.png",
      } as unknown as QuestionSignaturePadModel;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", signatureQuestion.backgroundImage);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        question: signatureQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      expect(mockImage.getAttribute("src")).toBe(
        `${signatureQuestion.backgroundImage}?${resolvedTokenResult.value.token}`,
      );
    });

    it("should handle file question type with content container", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const file: ProtectedFile = {
        content: "https://testaccount.blob.core.windows.net/content/file.pdf",
      } as ProtectedFile;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", file.content);
      mockHtmlElement.appendChild(mockImage);

      const fileQuestion = {
        getType: () => "file",
        value: file,
        renderedPages: [
          {
            items: [file],
          },
        ],
        indexToShow: 0,
      } as unknown as QuestionFileModel;

      const event = {
        question: fileQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // File question type is no longer handled in onAfterRenderQuestion
      // The token is resolved via resolveStorageUrl when the image src is updated
      // Since there's no image with matching src, nothing should change
      expect(mockImage.getAttribute("src")).toBe(file.content);
    });

    it("should handle file question type with user-files container", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const file: ProtectedFile = {
        content:
          "https://testaccount.blob.core.windows.net/user-files/document.pdf",
      } as ProtectedFile;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", file.content);
      mockHtmlElement.appendChild(mockImage);

      const fileQuestion = {
        getType: () => "file",
        value: file,
        renderedPages: [
          {
            items: [file],
          },
        ],
        indexToShow: 0,
      } as unknown as QuestionFileModel;

      const event = {
        question: fileQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // File question type is no longer handled in onAfterRenderQuestion
      // The token is resolved via resolveStorageUrl when the image src is updated
      expect(mockImage.getAttribute("src")).toBe(file.content);
    });

    it("should handle file question with array value", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const files: ProtectedFile[] = [
        {
          content:
            "https://testaccount.blob.core.windows.net/content/file1.pdf",
        } as ProtectedFile,
        {
          content:
            "https://testaccount.blob.core.windows.net/user-files/file2.pdf",
        } as ProtectedFile,
      ];

      const mockHtmlElement = document.createElement("div");
      const mockImage1 = document.createElement("img");
      mockImage1.setAttribute("src", files[0].content);
      const mockImage2 = document.createElement("img");
      mockImage2.setAttribute("src", files[1].content);
      mockHtmlElement.appendChild(mockImage1);
      mockHtmlElement.appendChild(mockImage2);

      const fileQuestion = {
        getType: () => "file",
        value: files,
        renderedPages: [
          {
            items: files,
          },
        ],
        indexToShow: 0,
      } as unknown as QuestionFileModel;

      const event = {
        question: fileQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // File question type is no longer handled in onAfterRenderQuestion
      // Tokens are no longer set on file objects
      expect(files[0].token).toBeUndefined();
      expect(files[1].token).toBeUndefined();
    });

    it("should handle header logo rendering", async () => {
      const props = createDefaultReadTokenPromises();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(mockStorageConfig, props),
        });
        result = view.result;
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const model = {
        ...mockSurveyModel,
        locLogo: {
          renderedHtml:
            "https://testaccount.blob.core.windows.net/content/logo.png",
        },
      } as unknown as SurveyModel;

      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.registerViewHandlers(model);

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", model.locLogo.renderedHtml);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderHeaderEvent;

      const handler = (
        model.onAfterRenderHeader.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      expect(mockImage.getAttribute("src")).toBe(
        `${model.locLogo.renderedHtml}?${resolvedTokenResult.value.token}`,
      );
    });

    it("should show not-allowed image when token is null", async () => {
      const noTokenResult = Result.success<ContainerReadToken>({
        token: null,
        containerName: "content",
        expiresOn: new Date(),
        generatedAt: new Date(),
      });

      const props = {
        userFiles: Promise.resolve(resolvedUserFilesTokenResult),
        content: Promise.resolve(noTokenResult),
      };
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageView(props), {
          wrapper: createWrapper(mockStorageConfig, props),
        });
        result = view.result;
        await props.userFiles;
        await props.content;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.registerViewHandlers(model);

      const imageQuestion = {
        getType: () => "image",
        imageLink:
          "https://testaccount.blob.core.windows.net/content/image.jpg",
      } as unknown as QuestionImageModel;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", imageQuestion.imageLink);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        question: imageQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // resolveStorageUrl returns notAllowedImageSrc.src when token is null
      expect(mockImage.getAttribute("src")).toBe("/not-allowed.svg");
      // The new implementation doesn't set aria-label or title
      expect(mockImage.getAttribute("aria-label")).toBeNull();
      expect(mockImage.title).toBe("");
    });

    it("should ignore URLs from different hostnames", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const imageQuestion = {
        getType: () => "image",
        imageLink:
          "https://other-storage.blob.core.windows.net/content/image.jpg",
      } as unknown as QuestionImageModel;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", imageQuestion.imageLink);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        question: imageQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // Should not modify the image src for different hostname
      expect(mockImage.getAttribute("src")).toBe(imageQuestion.imageLink);
    });

    it("should ignore data URLs", async () => {
      const { result } = await renderHookWithSuspense();

      const model = { ...mockSurveyModel } as SurveyModel;
      result.current.registerViewHandlers(model);

      const imageQuestion = {
        getType: () => "image",
        imageLink:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      } as unknown as QuestionImageModel;

      const mockHtmlElement = document.createElement("div");
      const mockImage = document.createElement("img");
      mockImage.setAttribute("src", imageQuestion.imageLink);
      mockHtmlElement.appendChild(mockImage);

      const event = {
        question: imageQuestion,
        htmlElement: mockHtmlElement,
      } as unknown as AfterRenderQuestionEvent;

      const handler = (
        model.onAfterRenderQuestion.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];

      handler(model, event);

      // Should not modify data URLs
      expect(mockImage.getAttribute("src")).toBe(imageQuestion.imageLink);
    });
  });
});
