import {
  AssetStorageContext,
  AssetStorageContextValue,
  StorageConfig,
} from "@/features/asset-storage/client";
import { render } from "@testing-library/react";
import { SurveyCreatorModel, SurveyModel } from "survey-creator-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// Import after mocks
import { ProtectedLogoImage, ProtectedLogoImageComponent } from "@/features/asset-storage/client";

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
    <AssetStorageContext.Provider value={contextValue || { config: null, resolveStorageUrl: vi.fn() }}>
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

  const view = instance.renderImage();

  return render(
    <AssetStorageContext.Provider value={contextValue || { config: null, resolveStorageUrl: vi.fn() }}>
      {view}
    </AssetStorageContext.Provider>,
  );
};

describe("ProtectedLogoImage", () => {
  const mockSurveyModel = {
    locLogo: {
      renderedHtml: "https://testaccount.blob.core.windows.net/content/logo.png",
    },
  } as unknown as SurveyModel;

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

      renderLogoImageWithContext(mockSurveyModel, {
        config: disabledConfig,
        resolveStorageUrl: vi.fn(),
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
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

      renderLogoImageWithContext(mockSurveyModel, {
        config: publicConfig,
        resolveStorageUrl: vi.fn(),
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
    });
  });

  describe("when storage is enabled and private", () => {
    it("should enrich logo when logoUrl exists", () => {
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

      renderLogoImageWithContext(mockSurveyModel, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
      });

      expect(mockRender).toHaveBeenCalled();
      // enrichImageInJSX is called with the src from the rendered element
      expect(mockResolveStorageUrl).toHaveBeenCalled();
    });

    it("should render default element when logoUrl is missing", () => {
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

      const surveyWithoutLogo = {
        locLogo: {
          renderedHtml: "",
        },
      } as unknown as SurveyModel;

      const mockResolveStorageUrl = vi.fn();

      renderLogoImageWithContext(surveyWithoutLogo, {
        config: privateConfig,
        resolveStorageUrl: mockResolveStorageUrl,
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
        renderedHtml: "https://testaccount.blob.core.windows.net/content/logo.png",
      },
    },
  } as unknown as SurveyCreatorModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render image component", () => {
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

    const view = renderLogoImageComponentWithContext(mockCreatorModel, {
      config: privateConfig,
      resolveStorageUrl: vi.fn(),
    });

    // Component should render without errors
    expect(view.container).toBeDefined();
  });
});
