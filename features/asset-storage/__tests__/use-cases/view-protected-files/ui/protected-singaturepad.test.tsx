import {
  AssetStorageContext,
  AssetStorageContextValue,
  ClientStorageConfig,
} from "@/features/asset-storage/client";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { QuestionSignaturePadModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientStorageConfig } from "../../../test-storage-config";

// Mock SurveyQuestionSignaturePad - must be before imports that use it
const mockRenderBackgroundImage = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("img", {
    src: "https://example.com/background.png",
  });
});

vi.mock("survey-react-ui", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    SurveyQuestionSignaturePad: class MockSurveyQuestionSignaturePad
      extends React.Component
    {
      protected get question() {
        return (this.props as any).question;
      }
      protected renderBackgroundImage() {
        return mockRenderBackgroundImage();
      }
    },
    ReactQuestionFactory: {
      Instance: {
        registerQuestion: vi.fn(),
      },
    },
  };
});

vi.mock(
  "@/features/asset-storage/ui/storage-presigned-image",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/asset-storage/ui/storage-presigned-image")
      >();
    return {
      ...actual,
      StoragePresignedImage: (props: { src: string }) => (
        <img data-testid="storage-presigned-image" src={props.src} alt="" />
      ),
    };
  },
);

// Import after mocks
import { ProtectedSignaturePad } from "@/features/asset-storage/client";

// Helper to render with context
const renderWithContext = (
  question: QuestionSignaturePadModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  // Create instance and manually set context
  const instance = new ProtectedSignaturePad({ question } as any);
  if (contextValue) {
    (instance as any).context = contextValue;
  } else {
    (instance as any).context = {
      config: null,
      getCachedPrivateReadUrl: vi.fn(() => null),
    };
  }

  const view = (
    instance as unknown as { renderBackgroundImage(): ReactNode }
  ).renderBackgroundImage();

  return render(
    <AssetStorageContext.Provider
      value={
        contextValue || {
          config: null,
          getCachedPrivateReadUrl: vi.fn(() => null),
          enqueuePrivateReadUrls: vi.fn(),
          mergePrivateReadUrlCache: vi.fn(),
          readUrlCacheVersion: 0,
        }
      }
    >
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedSignaturePad", () => {
  const mockQuestion = {
    backgroundImage: "https://testaccount.blob.core.windows.net/content/bg.png",
    cssClasses: { backgroundImage: "sd-signaturepad__background" },
    renderedCanvasWidth: 300,
  } as unknown as QuestionSignaturePadModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when storage is disabled", () => {
    it("should render default background image without enrichment", () => {
      const disabledConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: false,
        isPrivate: false,
      });

      renderWithContext(mockQuestion, {
        config: disabledConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(mockRenderBackgroundImage).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled but not private", () => {
    it("should render default background image without enrichment", () => {
      const publicConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: true,
        isPrivate: false,
      });

      renderWithContext(mockQuestion, {
        config: publicConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(mockRenderBackgroundImage).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled and private", () => {
    it("uses StoragePresignedImage when backgroundImage exists", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      renderWithContext(mockQuestion, {
        config: privateConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(screen.getByTestId("storage-presigned-image")).toBeDefined();
      expect(mockRenderBackgroundImage).not.toHaveBeenCalled();
    });

    it("should return null when backgroundImage is missing", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const questionWithoutBackground = {
        backgroundImage: undefined,
      } as unknown as QuestionSignaturePadModel;

      const mockResolveStorageUrl = vi.fn();

      const { container } = renderWithContext(questionWithoutBackground, {
        config: privateConfig,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(mockRenderBackgroundImage).not.toHaveBeenCalled();
      expect(container.firstChild).toBeNull();
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });
  });

  describe("when context is undefined", () => {
    it("should render default background image without enrichment", () => {
      renderWithContext(mockQuestion, undefined);

      expect(mockRenderBackgroundImage).toHaveBeenCalledTimes(1);
    });
  });
});
