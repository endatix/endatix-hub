import {
  AssetStorageContext,
  type AssetStorageContextValue,
} from "@/features/asset-storage/ui/asset-storage.context";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QuestionImageModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientStorageConfig } from "../../../test-storage-config";

const mockRenderElement = vi.fn(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("img", { src: "https://example.com/image.jpg" });
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

vi.mock("survey-react-ui", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
    SurveyQuestionImage: class MockSurveyQuestionImage extends React.Component {
      declare questionBase: QuestionImageModel;

      constructor(props: { question: QuestionImageModel }) {
        super(props);
        this.questionBase = props.question;
      }

      protected get question(): QuestionImageModel {
        return this.questionBase;
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

import { ProtectedQuestionImage } from "@/features/asset-storage/use-cases/view-protected-files/ui/protected-image";

function buildContext(
  overrides: Partial<AssetStorageContextValue> = {},
): AssetStorageContextValue {
  return {
    config: clientStorageConfig({ isPrivate: true }),
    enqueuePrivateReadUrls: vi.fn().mockResolvedValue(new Map()),
    mergePrivateReadUrlCache: vi.fn(),
    getCachedPrivateReadUrl: vi.fn(() => null),
    readUrlCacheVersion: 0,
    ...overrides,
  };
}

function renderProtectedImage(
  question: QuestionImageModel,
  contextValue: AssetStorageContextValue,
) {
  const instance = new ProtectedQuestionImage({ question } as never);
  (instance as { context: AssetStorageContextValue }).context = contextValue;

  const view = (
    instance as unknown as { renderElement(): ReactNode }
  ).renderElement();

  return render(
    <AssetStorageContext.Provider value={contextValue}>
      {view}
    </AssetStorageContext.Provider>,
  );
}

describe("ProtectedQuestionImage", () => {
  const mockQuestion = {
    imageLink: "https://testaccount.blob.core.windows.net/content/image.jpg",
    renderedMode: "image",
    getImageCss: () => "sd-image",
    imageFit: "contain",
    renderedStyleWidth: "100%",
    renderedStyleHeight: "auto",
    renderedAltText: "alt",
    renderedWidth: 200,
    renderedHeight: 100,
    contentNotLoaded: false,
    cssClasses: {
      root: "sd-image__root",
      noImage: "sd-image__no-image",
      noImageSvgIconId: "icon-no-image",
    },
    locImageLink: {
      renderedHtml:
        "https://testaccount.blob.core.windows.net/content/image.jpg",
      onChanged: () => {},
    },
    onLoadHandler: vi.fn(),
    onErrorHandler: vi.fn(),
  } as unknown as QuestionImageModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses StoragePresignedImage when private storage is enabled", () => {
    renderProtectedImage(mockQuestion, buildContext());

    expect(screen.getByTestId("storage-presigned-image")).toBeDefined();
    expect(mockRenderElement).not.toHaveBeenCalled();
  });

  it("delegates to super when storage is disabled", () => {
    renderProtectedImage(
      mockQuestion,
      buildContext({
        config: clientStorageConfig({ isEnabled: false, isPrivate: false }),
      }),
    );

    expect(mockRenderElement).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("storage-presigned-image")).toBeNull();
  });

  it("delegates to super when image link is empty", () => {
    const questionWithoutImage = {
      ...mockQuestion,
      imageLink: "",
      locImageLink: { renderedHtml: "", onChanged: () => {} },
    } as unknown as QuestionImageModel;

    renderProtectedImage(questionWithoutImage, buildContext());

    expect(mockRenderElement).toHaveBeenCalledTimes(1);
  });
});
