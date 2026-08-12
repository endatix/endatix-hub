import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { registerMatrixCarouselSchema } from "@/lib/survey-features/matrix-carousel/infrastructure/registry";
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

describe("collectModelStorageAssets — matrix rows", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  it("collects imageUrl from matrix rows, not choices", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: ["1", "2"],
              rows: [
                { value: "r1", text: "Row 1", imageUrl: "https://example.com/r1.png" },
                { value: "r2", text: "Row 2" },
              ],
            },
          ],
        },
      ],
    });

    // Act
    const { urls } = collectModelStorageAssets(model);

    // Assert
    expect(urls).toEqual(["https://example.com/r1.png"]);
  });

  it("rewrites a matrix row's imageUrl in place via setUrl", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: ["1", "2"],
              rows: [{ value: "r1", text: "Row 1", imageUrl: "https://old.example.com/r1.png" }],
            },
          ],
        },
      ],
    });

    // Act
    const { refs } = collectModelStorageAssets(model);
    refs[0].setUrl("https://new.example.com/r1.png");

    // Assert
    const question = model.getQuestionByName("q1");
    expect((question?.rows[0] as unknown as { imageUrl: string }).imageUrl).toBe(
      "https://new.example.com/r1.png",
    );
  });

  it("collects nothing for a matrix question with no row images", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            { type: "matrix", name: "q1", columns: ["1", "2"], rows: ["r1", "r2"] },
          ],
        },
      ],
    });

    // Act
    const { urls } = collectModelStorageAssets(model);

    // Assert
    expect(urls).toEqual([]);
  });
});
