import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { Model } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { collectModelStorageAssets } from "../collect-model-storage-assets";

const IMAGE_A = "https://acc.blob.core.windows.net/content/a.png";
const IMAGE_B = "https://acc.blob.core.windows.net/content/b.png";

function createDragCategorizeModel(): Model {
  return new Model({
    pages: [
      {
        elements: [
          {
            type: "dragcategorize",
            name: "q1",
            choices: [
              { value: "item_1", text: "Item 1", imageUrl: IMAGE_A },
              { value: "item_2", text: "Item 2", imageUrl: IMAGE_B },
              { value: "item_3", text: "No image" },
            ],
            zones: [{ value: "zone1" }, { value: "zone2" }],
          },
        ],
      },
    ],
  });
}

describe("collectModelStorageAssets — drag categorize", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("collects item image urls so they can be authorized", () => {
    // Arrange
    const model = createDragCategorizeModel();

    // Act
    const assets = collectModelStorageAssets(model);

    // Assert
    expect(assets.urls).toEqual(expect.arrayContaining([IMAGE_A, IMAGE_B]));
  });

  it("skips items without an image", () => {
    // Arrange
    const model = createDragCategorizeModel();

    // Act
    const assets = collectModelStorageAssets(model);

    // Assert
    expect(assets.urls).toHaveLength(2);
  });

  it("rewrites the item image url when a token is applied", () => {
    // Arrange
    const model = createDragCategorizeModel();
    const assets = collectModelStorageAssets(model);

    // Act
    assets.refs
      .find((ref) => ref.url === IMAGE_A)
      ?.setUrl(`${IMAGE_A}?sig=token`);

    // Assert
    const question = model.getQuestionByName("q1")!;
    const item = question.choices.find(
      (choice: { value: unknown }) => choice.value === "item_1",
    );
    expect(item.imageUrl).toBe(`${IMAGE_A}?sig=token`);
  });
});
