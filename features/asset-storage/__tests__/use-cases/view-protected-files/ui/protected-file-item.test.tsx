import {
  AssetStorageContext,
  type AssetStorageContextValue,
} from "@/features/asset-storage/ui/asset-storage.context";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuestionFileModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientStorageConfig } from "../../../test-storage-config";

vi.mock("@/features/asset-storage/ui/storage-presigned-image", () => ({
  StoragePresignedImage: (props: { src: string }) => (
    <img data-testid="storage-presigned-image" src={props.src} alt="preview" />
  ),
}));

vi.mock("@/features/asset-storage/ui/storage-presigned-link", () => ({
  StoragePresignedLink: (props: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a data-testid="storage-presigned-link" href={props.href}>
      {props.children}
    </a>
  ),
}));

import { ProtectedSurveyFileItem } from "@/features/asset-storage/use-cases/view-protected-files/ui/protected-file-item";

function buildContext(): AssetStorageContextValue {
  return {
    config: clientStorageConfig({ isPrivate: true }),
    enqueuePrivateReadUrls: vi.fn().mockResolvedValue(new Map()),
    mergePrivateReadUrlCache: vi.fn(),
    getCachedPrivateReadUrl: vi.fn(() => null),
    readUrlCacheVersion: 0,
  };
}

describe("ProtectedSurveyFileItem", () => {
  const fileContent =
    "https://testaccount.blob.core.windows.net/content/photo.jpg";

  const mockQuestion = {
    cssClasses: {
      previewItem: "sd-file__preview-item",
      fileSign: "sd-file__sign",
      fileSignBottom: "sd-file__sign-bottom",
      removeFile: "Remove",
      removeFileSvgIconId: "icon-remove",
      removeFileSvg: "sd-file__remove-svg",
      defaultImage: "sd-file__default",
      defaultImageIconId: "icon-file",
    },
    imageWidth: 100,
    imageHeight: 80,
    isReadOnly: false,
    removeFileCaption: "Remove",
    canPreviewImage: () => true,
    getImageWrapperCss: () => "sd-file__image-wrapper",
    getRemoveButtonCss: () => "sd-file__remove",
    doDownloadFile: vi.fn(),
    doDownloadFileFromContainer: vi.fn(),
    doRemoveFile: vi.fn(),
  } as unknown as QuestionFileModel;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders presigned preview and link when private", () => {
    const instance = new ProtectedSurveyFileItem({
      question: mockQuestion,
      item: { content: fileContent, name: "photo.jpg" },
    } as never);
    (instance as { context: AssetStorageContextValue }).context =
      buildContext();

    const view = (
      instance as unknown as { renderElement(): React.ReactNode }
    ).renderElement();

    render(
      <AssetStorageContext.Provider value={buildContext()}>
        {view}
      </AssetStorageContext.Provider>,
    );

    expect(screen.getByTestId("storage-presigned-image")).toBeDefined();
    expect(screen.getAllByTestId("storage-presigned-link").length).toBe(2);
  });

  it("downloads from the container with keyboard activation", () => {
    const instance = new ProtectedSurveyFileItem({
      question: mockQuestion,
      item: { content: fileContent, name: "photo.jpg" },
    } as never);
    (instance as { context: AssetStorageContextValue }).context =
      buildContext();

    const view = (
      instance as unknown as { renderElement(): React.ReactNode }
    ).renderElement();

    render(
      <AssetStorageContext.Provider value={buildContext()}>
        {view}
      </AssetStorageContext.Provider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Download photo.jpg" }),
      {
        key: "Enter",
      },
    );

    expect(mockQuestion.doDownloadFileFromContainer).toHaveBeenCalledTimes(1);
  });

  it("removes the file with keyboard activation", () => {
    const instance = new ProtectedSurveyFileItem({
      question: mockQuestion,
      item: { content: fileContent, name: "photo.jpg" },
    } as never);
    (instance as { context: AssetStorageContextValue }).context =
      buildContext();

    const view = (
      instance as unknown as { renderElement(): React.ReactNode }
    ).renderElement();

    render(
      <AssetStorageContext.Provider value={buildContext()}>
        {view}
      </AssetStorageContext.Provider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Remove photo.jpg" }),
      {
        key: "Enter",
      },
    );

    expect(mockQuestion.doRemoveFile).toHaveBeenCalledTimes(1);
    expect(mockQuestion.doDownloadFileFromContainer).not.toHaveBeenCalled();
  });
});
