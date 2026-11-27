// @vitest-environment jsdom
import { expect, it } from "vitest";
import { fileLabel, imageOption } from "../ui/image-label";

it.each([
  [String.raw`C:\fakepath\North_trail-map.JPG`, "North trail map"],
  ["archive/Forêt.du_nord.png", "Forêt du nord"],
  ["pasted-image-2.png", ""],
  ["Screenshot 2026-08-01 at 10.21.30 AM.png", ""],
  ["8c783ec0-265a-4f49-a82b-96253bd97ce9.png", ""],
  ["https://example.invalid/file.png?sig=abc", ""],
  ["data:image/png;base64,AAAA", ""],
])("suggests only meaningful filename text (%s)", (name, expected) => {
  expect(fileLabel(name)).toBe(expected);
});

it.each([
  ["https://example.invalid/photos/North%20ridge.jpg?sig=private", "North ridge"],
  ["https://example.invalid/photos/8c783ec0-265a-4f49-a82b-96253bd97ce9.webp", "Unlabeled image"],
  ["data:image/png;base64,AAAA", "Unlabeled image"],
  ["blob:opaque", "Unlabeled image"],
])("provides an occurrence label without changing the respondent's alt", (source, expected) => {
  const image = document.createElement("img");
  image.src = source;
  expect(imageOption(image, 1)).toBe(`2. ${expected}`);
  expect(image.hasAttribute("alt")).toBe(false);
});
