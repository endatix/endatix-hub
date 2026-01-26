import { renderSurveyJsComponent } from "@/__tests__/utils/test-utils";
import {
  AssetStorageContext,
  AssetStorageContextValue,
  StorageConfig,
} from "@/features/asset-storage/client";
import { render } from "@testing-library/react";
import { QuestionImageModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock SurveyQuestionImage - must be before imports that use it
const mockRenderElement = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("img", { src: "https://example.com/image.jpg" });
});

vi.mock("survey-react-ui", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    SurveyQuestionImage: class MockSurveyQuestionImage extends React.Component {
      protected get question() {
        return (this.props as any).question;
      }
      protected renderElement() {
        return mockRenderElement();
      }
    },
    ReactQuestionFactory: {
      Instance: {
        registerQuestion: vi.fn(),
      },
    },
  };
});

// Import after mocks
import { ProtectedQuestionImage } from "@/features/asset-storage/client";

// Helper to render with context
const renderWithContext = (
  question: QuestionImageModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  if (contextValue === undefined) {
    return renderSurveyJsComponent(ProtectedQuestionImage, question);
  }

  // Create instance and manually set context
  const instance = new ProtectedQuestionImage({ question } as any);
  if (contextValue) {
    (instance as any).context = contextValue;
  }

  const view = instance.renderElement();

  return render(
    <AssetStorageContext.Provider value={contextValue}>
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedQuestionImage", () => {
  const mockQuestion = {
    locImageLink: {
      renderedHtml: "https://testaccount.blob.core.windows.net/content/image.jpg",
    },
  } as unknown as QuestionImageModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when storage is disabled", () => {
    it("should render default element without enrichment", () => {
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

      renderWithContext(mockQuestion, {
        config: disabledConfig,
        resolveStorageUrl: vi.fn(),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled but not private", () => {
    it("should render default element without enrichment", () => {
      const publicConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      renderWithContext(mockQuestion, {
        config: publicConfig,
        resolveStorageUrl: vi.fn(),
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled and private", () => {
    it("should attempt enrichment when imageLink exists", () => {
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

      const mockResolveStorageUrl = vi.fn(
        (url: string) => `${url}?token=abc123`,
      );

      renderWithContext(mockQuestion, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      // Component should call renderElement (which calls super.renderElement)
      // and then attempt to enrich the result
      expect(mockRenderElement).toHaveBeenCalled();
    });

    it("should render default element when imageLink is missing", () => {
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

      const questionWithoutImage = {
        locImageLink: {
          renderedHtml: "",
        },
      } as unknown as QuestionImageModel;

      const mockResolveStorageUrl = vi.fn();

      renderWithContext(questionWithoutImage, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });
  });

  describe("when context is undefined", () => {
    it("should render default element without enrichment", () => {
      renderWithContext(mockQuestion, undefined);

      expect(mockRenderElement).toHaveBeenCalledTimes(1);
    });
  });
});
