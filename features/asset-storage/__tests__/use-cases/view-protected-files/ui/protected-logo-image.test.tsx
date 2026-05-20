import {
  AssetStorageContext,
  AssetStorageContextValue,
  ClientStorageConfig,
} from "@/features/asset-storage/client";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { SurveyModel } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientStorageConfig } from "../../../test-storage-config";

// Mock LogoImage - must be before imports that use it
const mockRender = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("img", { src: "https://example.com/logo.png" });
});

// Mock LogoImageComponent - must be before imports that use it
const mockRenderImage = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("div", { "data-testid": "logo-image" });
});

const mockRenderButtons = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("div", { "data-testid": "logo-buttons" });
});

vi.mock("survey-react-ui", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    LogoImage: class MockLogoImage extends React.Component {
      render() {
        return mockRender();
      }
    },
    ReactElementFactory: {
      Instance: {
        registerElement: vi.fn(),
      },
    },
  };
});

vi.mock("survey-creator-react", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-creator-react")>();
  return {
    ...actual,
    LogoImageComponent: class MockLogoImageComponent extends React.Component {
      protected renderImage() {
        return mockRenderImage();
      }
      protected renderButtons() {
        return mockRenderButtons();
      }
      protected getStateElement() {
        return {
          containerCss: "svc-logo-image-container",
        };
      }
      protected getViewModel() {
        return {
          containerCss: "svc-logo-image-container",
        };
      }
    },
  };
});

vi.mock(
  "@/features/asset-storage/use-cases/view-protected-files/ui/protected-storage-media",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/asset-storage/use-cases/view-protected-files/ui/protected-storage-media")
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
import {
  ProtectedLogoImage,
  ProtectedLogoImageComponent,
} from "@/features/asset-storage/client";

// Helper to render ProtectedLogoImage with context
const renderLogoImageWithContext = (
  surveyModel: SurveyModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  const instance = new ProtectedLogoImage({ data: surveyModel });
  if (contextValue) {
    (instance as any).context = contextValue;
  }

  const view = instance.render();

  return render(
    <AssetStorageContext.Provider
      value={
        contextValue || {
          config: null,
          getCachedPrivateReadUrl: vi.fn(() => null),
        }
      }
    >
      {view}
    </AssetStorageContext.Provider>,
  );
};

// Helper to render ProtectedLogoImageComponent with context
const renderLogoImageComponentWithContext = (
  creatorModel: SurveyCreatorModel,
  contextValue?: AssetStorageContextValue | undefined,
) => {
  const instance = new ProtectedLogoImageComponent({ data: creatorModel });
  if (contextValue) {
    (instance as any).context = contextValue;
  }

  const view = (
    instance as unknown as { renderImage(): ReactNode }
  ).renderImage();

  return render(
    <AssetStorageContext.Provider
      value={
        contextValue || {
          config: null,
          getCachedPrivateReadUrl: vi.fn(() => null),
        }
      }
    >
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedLogoImage", () => {
  const mockSurveyModel = {
    locLogo: {
      renderedHtml:
        "https://testaccount.blob.core.windows.net/content/logo.png",
    },
    locTitle: { renderedHtml: "Survey title" },
    logoClassNames: "sv-logo",
    css: { logoImage: "sd-logo__image" },
    renderedLogoWidth: 120,
    renderedLogoHeight: 40,
    logoFit: "contain",
    renderedStyleLogoWidth: "120px",
    renderedStyleLogoHeight: "40px",
  } as unknown as SurveyModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when storage is disabled", () => {
    it("should render default element without enrichment", () => {
      const disabledConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: false,
        isPrivate: false,
      });

      renderLogoImageWithContext(mockSurveyModel, {
        config: disabledConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled but not private", () => {
    it("should render default element without enrichment", () => {
      const publicConfig: ClientStorageConfig = clientStorageConfig({
        isEnabled: true,
        isPrivate: false,
      });

      renderLogoImageWithContext(mockSurveyModel, {
        config: publicConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled and private", () => {
    it("uses StoragePresignedImage when logoUrl exists", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      renderLogoImageWithContext(mockSurveyModel, {
        config: privateConfig,
        getCachedPrivateReadUrl: vi.fn(() => null),
        enqueuePrivateReadUrls: vi.fn(),
        mergePrivateReadUrlCache: vi.fn(),
        readUrlCacheVersion: 0,
      });

      expect(screen.getByTestId("storage-presigned-image")).toBeDefined();
      expect(mockRender).not.toHaveBeenCalled();
    });

    it("should render default element when logoUrl is missing", () => {
      const privateConfig: ClientStorageConfig = clientStorageConfig({
        isPrivate: true,
      });

      const surveyWithoutLogo = {
        locLogo: {
          renderedHtml: "",
        },
      } as unknown as SurveyModel;

      const mockResolveStorageUrl = vi.fn();

      renderLogoImageWithContext(surveyWithoutLogo, {
        config: privateConfig,
        getCachedPrivateReadUrl: mockResolveStorageUrl,
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(mockResolveStorageUrl).not.toHaveBeenCalled();
    });
  });

  describe("when context is undefined", () => {
    it("should render default element without enrichment", () => {
      renderLogoImageWithContext(mockSurveyModel, undefined);

      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });
});

describe("ProtectedLogoImageComponent", () => {
  const mockCreatorModel = {
    survey: {
      locLogo: {
        renderedHtml:
          "https://testaccount.blob.core.windows.net/content/logo.png",
      },
    },
  } as unknown as SurveyCreatorModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render image component", () => {
    const privateConfig: ClientStorageConfig = clientStorageConfig({
      isPrivate: true,
    });

    const view = renderLogoImageComponentWithContext(mockCreatorModel, {
      config: privateConfig,
      getCachedPrivateReadUrl: vi.fn(() => null),
    });

    // Component should render without errors
    expect(view.container).toBeDefined();
  });
});
