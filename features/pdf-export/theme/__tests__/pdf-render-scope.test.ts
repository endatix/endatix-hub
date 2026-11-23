import { expect, it } from "vitest";
import { currentPdfStyles, withPdfStyles } from "../pdf-theme-context";

it("keeps overlapping exports' styles separate across async rendering", async () => {
  // Arrange
  const definition = { themeModel: '{"cssVariables":{"--sjs-general-forecolor":"#123"}}' };
  const readPage = async () => {
    await Promise.resolve();
    return currentPdfStyles().page;
  };

  // Act
  const pages = await Promise.all([
    withPdfStyles(definition, readPage),
    withPdfStyles(undefined, readPage),
  ]);

  // Assert
  expect(pages).toEqual([{ color: "#112233" }, {}]);
  expect(currentPdfStyles().page).toEqual({});
});
