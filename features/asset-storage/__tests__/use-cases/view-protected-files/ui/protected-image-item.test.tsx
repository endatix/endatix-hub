import {
  AssetStorageContext,
  AssetStorageContextValue,
  StorageConfig,
} from "@/features/asset-storage/client";
import { render } from "@testing-library/react";
import { ImageItemValue, QuestionImagePickerModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRenderItem = vi.fn((item: ImageItemValue) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("div", {
    "data-testid": "image-item",
    "data-src": item.locImageLink?.renderedHtml || item.imageLink,
  });
});

vi.mock("survey-react-ui", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    SurveyQuestionImagePicker: class MockSurveyQuestionImagePicker
      extends React.Component
    {
      protected renderItem(item: ImageItemValue) {
        return mockRenderItem(item);
      }
    },
    ReactQuestionFactory: {
      Instance: {
        registerQuestion: vi.fn(),
      },
    },
    ReactElementFactory: {
      Instance: {
        registerElement: vi.fn(),
      },
    },
  };
});

vi.mock("survey-creator-react", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-creator-react")>();
  return {
    ...actual,
    ImageItemValueAdornerComponent: class MockImageItemValueAdornerComponent
      extends React.Component
    {
      private _model = {
        itemsRoot: document.createElement("div"),
      };
      get model() {
        return this._model;
      }
      set model(value: any) {
        this._model = value;
      }
      componentDidMount() {
        // Mock implementation
      }
      componentDidUpdate() {
        // Mock implementation
      }
      componentWillUnmount() {
        // Mock implementation
      }
    },
  };
});

// Import after mocks
import {
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
} from "@/features/asset-storage/client";

// Helper to render ProtectedSurveyQuestionImagePicker with context
const renderImagePickerWithContext = (
  question: QuestionImagePickerModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  const instance = new ProtectedSurveyQuestionImagePicker({ question });
  if (contextValue) {
    (instance as any).context = contextValue;
  }

  // Create a test item
  const testItem = {
    imageLink: "https://testaccount.blob.core.windows.net/content/image.jpg",
    locImageLink: {
      renderedHtml:
        "https://testaccount.blob.core.windows.net/content/image.jpg",
    },
    clone: function () {
      return {
        ...this,
        imageLink: this.imageLink,
        locImageLink: { ...this.locImageLink },
      };
    },
  } as unknown as ImageItemValue;

  const view = instance.renderItem(testItem, {});

  return render(
    <AssetStorageContext.Provider
      value={contextValue || { config: null, resolveStorageUrl: vi.fn() }}
    >
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedSurveyQuestionImagePicker", () => {
  const mockQuestion = {} as unknown as QuestionImagePickerModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when storage is disabled", () => {
    it("should render item without enrichment", () => {
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

      const mockResolveStorageUrl = vi.fn();

      renderImagePickerWithContext(mockQuestion, {
        config: disabledConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderItem).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });
  });

  describe("when storage is enabled but not private", () => {
    it("should render item without enrichment", () => {
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

      const mockResolveStorageUrl = vi.fn();

      renderImagePickerWithContext(mockQuestion, {
        config: publicConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderItem).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });
  });

  describe("when storage is enabled and private", () => {
    it("should enrich item when renderedHtml exists and URL changes", () => {
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

      renderImagePickerWithContext(mockQuestion, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRenderItem).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).toHaveBeenCalledWith(
        "https://testaccount.blob.core.windows.net/content/image.jpg",
      );
    });

    it("should not enrich when resolved URL is the same", () => {
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

      const originalUrl =
        "https://testaccount.blob.core.windows.net/content/image.jpg";
      const mockResolveStorageUrl = vi.fn((url: string) => url);

      const instance = new ProtectedSurveyQuestionImagePicker({
        question: mockQuestion,
      } as any);
      (instance as any).context = {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      };

      const testItem = {
        imageLink: originalUrl,
        locImageLink: {
          renderedHtml: originalUrl,
        },
        clone: function () {
          return {
            ...this,
            imageLink: this.imageLink,
            locImageLink: { ...this.locImageLink },
          };
        },
      } as unknown as ImageItemValue;

      instance.renderItem(testItem, {});

      expect(mockResolveStorageUrl).toHaveBeenCalledWith(originalUrl);
      // When URL doesn't change, it should call super.renderItem with original item
      expect(mockRenderItem).toHaveBeenCalled();
    });

    it("should render default item when renderedHtml is missing", () => {
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

      const mockResolveStorageUrl = vi.fn();

      const instance = new ProtectedSurveyQuestionImagePicker({
        question: mockQuestion,
      });
      (instance as any).context = {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      };

      const testItem = {
        imageLink: "https://example.com/image.jpg",
        locImageLink: {
          renderedHtml: "",
        },
        clone: function () {
          return {
            ...this,
            imageLink: this.imageLink,
            locImageLink: { ...this.locImageLink },
          };
        },
      } as unknown as ImageItemValue;

      instance.renderItem(testItem, {});

      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
      expect(mockRenderItem).toHaveBeenCalled();
    });
  });

  describe("when context is undefined", () => {
    it("should render item without enrichment", () => {
      renderImagePickerWithContext(mockQuestion, undefined);

      expect(mockRenderItem).toHaveBeenCalledTimes(1);
    });
  });
});

describe("ProtectedImageItemValueAdorner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = "";
  });

  it("should not update images when storage is disabled", async () => {
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

    const mockResolveStorageUrl = vi.fn();

    const instance = new ProtectedImageItemValueAdorner({
      question: {
        isItemInList: () => true,
      } as any,
      item: {} as any,
    });
    (instance as any).context = {
      config: disabledConfig,
      resolveStorageUrl: mockResolveStorageUrl,
    };
    (instance as any).model = {
      itemsRoot: document.createElement("div"),
    };

    instance.componentDidUpdate({}, {});

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Component should not call resolveStorageUrl when storage is disabled
    // The updateImages method checks config.isEnabled && config.isPrivate
    expect(mockResolveStorageUrl).not.toHaveBeenCalled();
  });

  it("should update images when storage is enabled and private", async () => {
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

    const mockResolveStorageUrl = vi.fn();

    const instance = new ProtectedImageItemValueAdorner({
      question: {
        isItemInList: () => true,
      } as any,
      item: {} as any,
    });
    (instance as any).context = {
      config: privateConfig,
      resolveStorageUrl: mockResolveStorageUrl,
    };
    (instance as any).model = {
      itemsRoot: document.createElement("div"),
    };

    instance.componentDidUpdate({}, {});

    await new Promise((resolve) => setTimeout(resolve, 10));
  });
});
