import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import React from "react";
import { QuestionFileModel } from "survey-core";
import { ProtectedFilePreview } from "@/features/asset-storage/client";
import { IFile } from "@/lib/questions/file/file-type";
import { renderSurveyJsComponent } from "@/__tests__/utils/test-utils";
import { StorageConfig } from "@/features/asset-storage/client";

// Mock SurveyFilePreview
const mockRenderElement = vi.fn(() => (
  <div data-testid="default-preview">Default Preview</div>
));

vi.mock("survey-react-ui", () => ({
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
}));

// Helper wrapper for ProtectedFilePreview
const renderWithContext = (
  question: QuestionFileModel,
  contextValue?: { config: StorageConfig | null } | undefined,
) => {
  return renderSurveyJsComponent(ProtectedFilePreview, question, {
    contextValue,
  });
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
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      renderWithContext(mockQuestion, { config: disabledConfig });

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
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      renderWithContext(mockQuestion, { config: privateConfig });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were modified with tokens
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

      renderWithContext(questionWithoutTokens, { config: privateConfig });

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

      renderWithContext(questionWithPartialTokens, { config: privateConfig });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);

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

      renderWithContext(questionWithEmptyPages, { config: privateConfig });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();
    });

    it("should handle missing currentShownPage gracefully", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
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

      renderWithContext(questionWithInvalidIndex, { config: privateConfig });

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
      renderWithContext(mockQuestion, { config: null });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("default-preview")).toBeDefined();

      // Verify items were NOT modified
      expect(mockQuestion.renderedPages[0].items[0].content).toBe(
        "https://testaccount.blob.core.windows.net/content/file1.pdf",
      );
    });
  });
});
