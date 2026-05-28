import {
  AssetStorageContext,
  AssetStorageContextValue,
  ClientStorageConfig,
} from "@/features/asset-storage/client";
import { render } from "@testing-library/react";
import { ImageItemValue, QuestionImagePickerModel } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStoragePresignedImage = vi.fn(({ src }: { src: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return React.createElement("img", {
    src,
    "data-testid": "storage-presigned-image",
  });
});

vi.mock("@/features/asset-storage/ui/storage-presigned-image", () => ({
  StoragePresignedImage: (props: { src: string }) =>
    mockStoragePresignedImage(props),
}));

vi.mock("survey-react-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("survey-react-ui")>();
  return {
    ...actual,
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
      set model(value: unknown) {
        this._model = value as { itemsRoot: HTMLElement };
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

import {
  ProtectedImagePickerItem,
  ProtectedSurveyQuestionImagePicker,
  ProtectedImageItemValueAdorner,
} from "@/features/asset-storage/client";
import type { ReactElement } from "react";
import { clientStorageConfig } from "../../../test-storage-config";

const BLOB_URL = "https://testaccount.blob.core.windows.net/content/image.jpg";

function buildImagePickerQuestion(): QuestionImagePickerModel {
  const question = new QuestionImagePickerModel("picker1");
  question.fromJSON({
    type: "imagepicker",
    name: "picker1",
    choices: [{ value: "a", imageLink: BLOB_URL }],
  });
  return question;
}

function buildPickerItem(question: QuestionImagePickerModel): ImageItemValue {
  return question.visibleChoices[0] as ImageItemValue;
}

const pickerCssClasses = {
  image: "sd-imagepicker__image",
  label: "sd-imagepicker__label",
  itemControl: "sd-imagepicker__control",
  itemNoImage: "sd-imagepicker__no-image",
};

describe("ProtectedSurveyQuestionImagePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses default Survey item when storage is not private", () => {
    const question = buildImagePickerQuestion();
    const instance = new ProtectedSurveyQuestionImagePicker({ question });
    (instance as { context: AssetStorageContextValue }).context = {
      config: clientStorageConfig({ isPrivate: false }),
      getCachedPrivateReadUrl: vi.fn(() => null),
    };

    const node = instance.renderItem(
      buildPickerItem(question),
      pickerCssClasses,
    );

    expect((node as ReactElement).type).not.toBe(ProtectedImagePickerItem);
  });

  it("renders ProtectedImagePickerItem when storage is private", () => {
    const question = buildImagePickerQuestion();
    const instance = new ProtectedSurveyQuestionImagePicker({ question });
    (instance as { context: AssetStorageContextValue }).context = {
      config: clientStorageConfig({ isPrivate: true }),
      getCachedPrivateReadUrl: vi.fn(() => null),
    };

    const node = instance.renderItem(
      buildPickerItem(question),
      pickerCssClasses,
    );

    expect((node as ReactElement).type).toBe(ProtectedImagePickerItem);
  });
});

describe("ProtectedImagePickerItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders StoragePresignedImage for image choices", () => {
    const question = buildImagePickerQuestion();
    const item = buildPickerItem(question);

    render(
      <AssetStorageContext.Provider
        value={{
          config: clientStorageConfig({ isPrivate: true }),
          getCachedPrivateReadUrl: vi.fn(() => null),
        }}
      >
        <ProtectedImagePickerItem
          question={question}
          item={item}
          cssClasses={pickerCssClasses}
        />
      </AssetStorageContext.Provider>,
    );

    expect(mockStoragePresignedImage).toHaveBeenCalled();
    expect(mockStoragePresignedImage.mock.calls[0][0].src).toContain(
      "testaccount.blob.core.windows.net",
    );
  });

  it("shows placeholder when image link is missing", () => {
    const question = buildImagePickerQuestion();
    const item = buildPickerItem(question);
    item.locImageLink.setValue("");
    item.imageLink = "";

    render(
      <AssetStorageContext.Provider
        value={{
          config: clientStorageConfig({ isPrivate: true }),
          getCachedPrivateReadUrl: vi.fn(() => null),
        }}
      >
        <ProtectedImagePickerItem
          question={question}
          item={item}
          cssClasses={pickerCssClasses}
        />
      </AssetStorageContext.Provider>,
    );

    expect(mockStoragePresignedImage).not.toHaveBeenCalled();
  });
});

describe("ProtectedImageItemValueAdorner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("should not update images when storage is disabled", async () => {
    const disabledConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: false,
      isPrivate: false,
    });

    const mockResolveStorageUrl = vi.fn();

    const instance = new ProtectedImageItemValueAdorner({
      question: {
        isItemInList: () => true,
      } as never,
      item: {} as never,
    });
    (instance as { context: AssetStorageContextValue }).context = {
      config: disabledConfig,
      getCachedPrivateReadUrl: mockResolveStorageUrl,
    };
    (instance as { model: { itemsRoot: HTMLElement } }).model = {
      itemsRoot: document.createElement("div"),
    };

    instance.componentDidUpdate({}, {});

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockResolveStorageUrl).not.toHaveBeenCalled();
  });

  it("should update images when cache version changes", async () => {
    const privateConfig: ClientStorageConfig = clientStorageConfig({
      isPrivate: true,
    });

    const mockResolveStorageUrl = vi.fn((url: string) => `${url}?token=abc`);

    const itemsRoot = document.createElement("div");
    const img = document.createElement("img");
    img.src = "https://testaccount.blob.core.windows.net/content/x.jpg";
    itemsRoot.appendChild(img);

    const instance = new ProtectedImageItemValueAdorner({
      question: {
        isItemInList: () => true,
      } as never,
      item: {} as never,
    });
    (instance as { context: AssetStorageContextValue }).context = {
      config: privateConfig,
      getCachedPrivateReadUrl: mockResolveStorageUrl,
      readUrlCacheVersion: 1,
    };
    (instance as { model: { itemsRoot: HTMLElement } }).model = { itemsRoot };

    instance.componentDidUpdate({}, {});

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockResolveStorageUrl).toHaveBeenCalled();
  });
});
