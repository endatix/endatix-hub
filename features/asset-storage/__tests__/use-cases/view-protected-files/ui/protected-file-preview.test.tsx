import { renderSurveyJsComponent } from "@/__tests__/utils/test-utils";
import {
  AssetStorageContext,
  AssetStorageContextValue,
  ProtectedFilePreview,
  ClientStorageConfig,
} from "@/features/asset-storage/client";
import { IFile } from "@/lib/questions/file/file-type";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QuestionFileModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientStorageConfig } from "../../../test-storage-config";

// Mock SurveyFilePreview - must be before imports that use it
const mockRenderElement = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement(
    "div",
    { "data-testid": "default-preview" },
    "Default Preview",
  );
});

vi.mock("survey-react-ui", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    SurveyFilePreview: class MockSurveyFilePreview extends React.Component {
      protected renderElement() {
        return mockRenderElement();
      }
    },
    ReactElementFactory: {
      Instance: {
        registerElement: vi.fn(),
      },
    },
  };
});

// Helper wrapper for ProtectedFilePreview
const renderWithContext = (
  question: QuestionFileModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  if (contextValue === undefined) {
    return renderSurveyJsComponent(ProtectedFilePreview, question);
  }

  // Create instance and manually set context since renderElement is called directly
  const instance = new ProtectedFilePreview({ question });
  if (contextValue) {
    // Manually set the context on the instance
    (instance as any).context = contextValue;
  }

  // Call renderElement to trigger the modification logic
  const view = (
    instance as unknown as { renderElement(): ReactNode }
  ).renderElement();

  // Render the result with context provider for any child components
  return render(
    <AssetStorageContext.Provider value={contextValue}>
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedFilePreview", () => {
  const mockQuestion = {
    renderedPages: [
      {
        items: [
          {
            content:
              "https://testaccount.blob.core.windows.net/content/file1.pdf",
            name: "file1.pdf",
            type: "application/pdf",
          } as IFile,
          {
            content:
              "https://testaccount.blob.core.windows.net/content/file2.jpg",
            name: "file2.jpg",
            type: "image/jpeg",
          } as IFile,
        ],
      },
    ],
    indexToShow: 0,
    value: [
      {
        content: "https://testaccount.blob.core.windows.net/content/file1.pdf",
        name: "file1.pdf",
        token: "token-123",
      } as IFile & { token?: string },
      {
        content: "https://testaccount.blob.core.windows.net/content/file2.jpg",
        name: "file2.jpg",
        token: "token-456",
      } as IFile & { token?: string },
    ],
  } as unknown as QuestionFileModel;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset items to original state before each test
    mockQuestion.renderedPages[0].items = [
      {
        content: "https://testaccount.blob.core.windows.net/content/file1.pdf",
        name: "file1.pdf",
        type: "application/pdf",
      } as IFile,
      {
        content: "https://testaccount.blob.core.windows.net/content/file2.jpg",
        name: "file2.jpg",
        type: "image/jpeg",
      } as IFile,
    ];
  });

  describe("when storage is disabled", () => {
    it("should render default preview without token injection", () => {
      const disabledConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: false,
        isPrivate: false,
      });

      renderWithContext(mockQuestion, {
        config: disabledConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were NOT modified
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
      expect(mockQuestion.renderedPages[0].items[1].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file2.jpg",
      );
    });
  });

  describe("when storage is enabled but not private", () => {
    it("should render default preview without token injection", () => {
      const publicConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: true,
        isPrivate: false,
      });

      renderWithContext(mockQuestion, {
        config: publicConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were NOT modified
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
      expect(mockQuestion.renderedPages[0].items[1].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file2.jpg",
      );
    });
  });

  describe("when storage is enabled and private", () => {
    it("renders preview without mutating file item content", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const mockResolveStorageUrl = vi.fn((url: string) => url);

      renderWithContext(mockQuestion, {
        config: privateConfig,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();

      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
    });

    it("should not modify items without matching tokens", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      // Create question with items that don't have matching tokens
      const questionWithoutTokens = {
        ...mockQuestion,
        renderedPages: [
          {
            items: [
              {
                content:
                  "https://testaccount.blob.core.windows.net/content/file3.pdf",
                name: "file3.pdf",
                type: "application/pdf",
              } as IFile,
            ],
          },
        ],
        value: [
          {
            content:
              "https://testaccount.blob.core.windows.net/content/file3.pdf",
            name: "file3.pdf",
            // No token
          } as IFile,
        ],
      } as unknown as QuestionFileModel;

      const mockResolveStorageUrl = vi.fn(() => null);

      renderWithContext(questionWithoutTokens, {
        config: privateConfig,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);

      // Verify item was NOT modified (no token available)
      expect(questionWithoutTokens.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file3.pdf",
      );
    });

    it("does not mutate items when only some would resolve", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const questionWithPartialTokens = {
        ...mockQuestion,
      } as unknown as QuestionFileModel;

      const mockResolveStorageUrl = vi.fn((url: string) => url);

      renderWithContext(questionWithPartialTokens, {
        config: privateConfig,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });

    it("should handle empty renderedPages gracefully", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const questionWithEmptyPages = {
        ...mockQuestion,
        renderedPages: [],
        indexToShow: 0,
      } as unknown as QuestionFileModel;

      renderWithContext(questionWithEmptyPages, {
        config: privateConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();
    });

    it("should handle missing currentShownPage gracefully", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const questionWithInvalidIndex = {
        ...mockQuestion,
        indexToShow: 999, // Invalid index
      } as unknown as QuestionFileModel;

      renderWithContext(questionWithInvalidIndex, {
        config: privateConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();
    });
  });

  describe("when context is undefined", () => {
    it("should render default preview without token injection", () => {
      renderWithContext(mockQuestion, undefined);

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were NOT modified
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
    });
  });

  describe("when context config is null", () => {
    it("should render default preview without token injection", () => {
      const mockResolveStorageUrl = vi.fn((url: string) => url);
      renderWithContext(mockQuestion, {
        config: null,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were NOT modified
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
    });
  });
});
