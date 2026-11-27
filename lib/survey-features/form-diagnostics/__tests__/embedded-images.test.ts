import { expect, it } from "vitest";
import { reviewEmbeddedImages, replaceEmbeddedImages } from "../embedded-images";

const png = "data:image/png;base64,iVBORw0KGgo=";
const stored = "https://storage.example/content/f/1/a.png";

it("replaces only source spans, using one file across locales and repeated placements", () => {
  // Arrange
  const html = (src: string) => `<img  style='width:100%; max-width:100px' SRC = '${src}'><b>Caption</b>`;
  const definition = (src: string) => ({
    pages: [{ name: "page", elements: [{ type: "radiogroup", name: "question", visible: true,
      choices: [{ value: "stable", text: { default: html(src) + html(src), fr: html(src) } }] }] }],
    description: `<img srcset='${png} 2x'><img src='https://example.invalid/external'>`,
  });
  const source = definition(png);

  // Act
  const review = reviewEmbeddedImages(source);
  const result = replaceEmbeddedImages(source, review, new Map([[review.files[0].key, stored]]));

  // Assert
  expect(review.eligible).toHaveLength(3);
  expect(review.skipped).toHaveLength(1);
  expect(review.files).toHaveLength(1);
  expect(review.files[0].bytes).toHaveLength(8);
  expect(result).toEqual(definition(stored));
  expect(source).toEqual(definition(png));
  expect(reviewEmbeddedImages(result).eligible).toHaveLength(0);
});
