import { expect, it } from "vitest";
import { choiceListCheck } from "../diagnostic-recommendations";
import { definitionBytes, ESTIMATED_LINK_BYTES, estimatedImageSavings, sizeChange } from "../definition-size";
import { replaceEmbeddedImages, reviewEmbeddedImages } from "../embedded-images";

const png = "data:image/png;base64,iVBORw0KGgo=";
it("estimates encoded bytes per placement, including when the stored links would be larger", () => {
  const source = { title: `<img src="${png}"><b>é</b><img src='${png}'>` };
  const review = reviewEmbeddedImages(source);
  const url = "https://cdn.example/content/f/1/test.png";
  const after = replaceEmbeddedImages(source, review, new Map([[review.files[0].key, url]]));

  expect(review.files.length).toBe(1);
  expect(estimatedImageSavings(review)).toBe(2 * (png.length - ESTIMATED_LINK_BYTES));
  expect(definitionBytes(source)).toBe(Buffer.byteLength(JSON.stringify(source)));
  expect(sizeChange(definitionBytes(source), definitionBytes(after)).delta).toBe(2 * (png.length - url.length));
});

it("uses only convertible inline lists for size and count recommendations", () => {
  const choices = ["x".repeat(110 * 1024)];
  const question = { type: "radiogroup", name: "pick", choices };
  const check = (elements: object[]) => choiceListCheck({ elements }, true);
  expect(check([question])).toMatchObject({ recommended: false, count: 0 });
  expect(check([question, { type: "dropdown", name: "tiny", choices: ["A"] }])).toMatchObject({ recommended: false, count: 1 });
  expect(check([{ ...question, type: "tagbox" }])).toMatchObject({ recommended: true, count: 1 });
  expect(choiceListCheck({ elements: [{ ...question, type: "dropdown" }] }, false).count).toBe(0);
});
