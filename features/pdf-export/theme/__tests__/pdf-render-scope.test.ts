import { expect, it } from "vitest";
import { createElement } from "react";
import { Document, Page, Text, pdf } from "@react-pdf/renderer";
import { currentPdfStyles, withPdfStyles } from "../pdf-theme-context";

function PaletteDocument() {
  const page = currentPdfStyles().page;
  // Stamp the observed color into the document metadata as well as the page ink.
  return createElement(
    Document,
    { title: page.color },
    createElement(
      Page,
      { style: page },
      createElement(Text, null, "Palette sample"),
    ),
  );
}

it("keeps overlapping exports' styles separate across async rendering", async () => {
  // Arrange
  const ready = Promise.withResolvers<void>();
  const render = (color: string) =>
    withPdfStyles(
      {
        themeModel: JSON.stringify({
          cssVariables: { "--sjs-general-forecolor": color },
        }),
      },
      async () => {
        await ready.promise;
        return pdf(createElement(PaletteDocument)).toBlob();
      },
    );

  // Act
  const first = render("#123");
  const second = render("#456");
  ready.resolve();
  const [dark, light] = await Promise.all([first, second]);

  // Assert
  expect(await dark.text()).toContain("(#112233)");
  expect(await light.text()).toContain("(#445566)");
  expect(currentPdfStyles().page).toEqual({});
});
