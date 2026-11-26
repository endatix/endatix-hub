import { describe, expect, it } from "vitest";
import { collectRichTextImageSources } from "../rich-text-image-sources";

describe("collectRichTextImageSources", () => {
  it("includes each authored locale of a matrix column's inline choices", () => {
    // Arrange
    const first = "https://store/content/f/1/one.png";
    const french = "https://store/content/t/7/deux.png";
    const definition = {
      elements: [
        {
          type: "matrixdropdown",
          columns: [
            {
              name: "rating",
              cellType: "radiogroup",
              choices: [
                {
                  value: "1",
                  text: {
                    default: `<img src="${first}">`,
                    fr: `<img src="${french}">`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    // Act & Assert
    expect([...collectRichTextImageSources(definition)]).toEqual([
      first,
      french,
    ]);
  });

  it("collects localized authored images without treating values or remote catalogs as content", () => {
    // Arrange
    const image = '<img alt="Logo" src="https://store/content/t/17/logo.png">';
    const definition = {
      pages: [
        {
          elements: [
            {
              choices: [
                {
                  value: '<img src="ignored">',
                  text: { fr: image, default: image },
                },
              ],
              defaultValue: { text: '<img src="answer">' },
              choicesByUrl: {
                url: "https://example.invalid/catalog",
                imageLinkName: "photo",
              },
            },
          ],
        },
      ],
    };

    // Act & Assert
    expect([...collectRichTextImageSources(definition)]).toEqual([
      "https://store/content/t/17/logo.png",
    ]);
  });
});
