import { describe, expect, it } from "vitest";
import { collectRichTextImageSources } from "../rich-text-image-sources";

describe("collectRichTextImageSources", () => {
  it("collects localized authored images without treating values or remote catalogs as content", () => {
    // Arrange
    const image = '<img alt="Logo" src="https://store/content/t/17/logo.png">';
    const definition = {
      pages: [{ elements: [{
        choices: [{ value: '<img src="ignored">', text: { fr: image, default: image } }],
        defaultValue: { text: '<img src="answer">' },
        choicesByUrl: { url: "https://example.invalid/catalog", imageLinkName: "photo" },
      }] }],
    };

    // Act & Assert
    expect([...collectRichTextImageSources(definition)]).toEqual(["https://store/content/t/17/logo.png"]);
  });
});
