import { renderSurveyJsComponent } from "@/__tests__/utils/test-utils";
import {
  AssetStorageContext,
  AssetStorageContextValue,
  ProtectedFilePreview,
  StorageConfig,
} from "@/features/asset-storage/client";
import { IFile } from "@/lib/questions/file/file-type";
import { render, screen } from "@testing-library/react";
import { QuestionFileModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock SurveyFilePreview - must be before imports that use it
const mockRenderElement = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("div", { "data-testid": "default-preview" }, "Default Preview");
});

vi.mock("survey-react-ui", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  const view = instance.renderElement();
  
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
      const disabledConfig: StorageConfig = {
        isEnabled: false,
        isPrivate: false,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      renderWithContext(mockQuestion, { config: disabledConfig, resolveStorageUrl: vi.fn() });

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
      const publicConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      renderWithContext(mockQuestion, { config: publicConfig });

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
    it("should inject tokens into file content URLs", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const mockResolveStorageUrl = vi.fn((url: string) => {
        if (url.includes("file1.pdf")) {
          return `${url}?token-123`;
        }
        if (url.includes("file2.jpg")) {
          return `${url}?token-456`;
        }
        return url;
      });

      renderWithContext(mockQuestion, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify resolveStorageUrl was called with the correct URLs
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://testaccount.blob.core.windows.net/content/file2.jpg",
      );

      // Verify items were modified with tokens via resolveStorageUrl
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf?token-123",
      );
      expect(mockQuestion.renderedPages[0].items[1].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file2.jpg?token-456",
      );
    });

    it("should not modify items without matching tokens", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

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

      // resolveStorageUrl returns original URL when no token is available
      const mockResolveStorageUrl = vi.fn((url: string) => url);

      renderWithContext(questionWithoutTokens, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);

      // Verify item was NOT modified (no token available)
      expect(questionWithoutTokens.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file3.pdf",
      );
    });

    it("should handle partial token matches correctly", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      // Create question where only one item has a token
      const questionWithPartialTokens = {
        ...mockQuestion,
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
        value: [
          {
            content:
              "https://testaccount.blob.core.windows.net/content/file1.pdf",
            name: "file1.pdf",
            token: "token-123",
          } as IFile & { token?: string },
          {
            content:
              "https://testaccount.blob.core.windows.net/content/file2.jpg",
            name: "file2.jpg",
            // No token for file2
          } as IFile,
        ],
      } as unknown as QuestionFileModel;

      const mockResolveStorageUrl = vi.fn((url: string) => {
        if (url.includes("file1.pdf")) {
          return `${url}?token-123`;
        }
        // Return original URL for file2 (no token)
        return url;
      });

      renderWithContext(questionWithPartialTokens, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);

      // Verify resolveStorageUrl was called for both items
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://testaccount.blob.core.windows.net/content/file2.jpg",
      );

      // Verify only the item with token was modified
      expect(questionWithPartialTokens.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf?token-123",
      );
      expect(questionWithPartialTokens.renderedPages[0].items[1].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file2.jpg",
      );
    });

    it("should handle empty renderedPages gracefully", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const questionWithEmptyPages = {
        ...mockQuestion,
        renderedPages: [],
        indexToShow: 0,
      } as unknown as QuestionFileModel;

      renderWithContext(questionWithEmptyPages, { config: privateConfig, resolveStorageUrl: vi.fn() });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();
    });

    it("should handle missing currentShownPage gracefully", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const questionWithInvalidIndex = {
        ...mockQuestion,
        indexToShow: 999, // Invalid index
      } as unknown as QuestionFileModel;

      renderWithContext(questionWithInvalidIndex, { config: privateConfig, resolveStorageUrl: vi.fn() });

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
        resolveStorageUrl: mockResolveStorageUrl,
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
