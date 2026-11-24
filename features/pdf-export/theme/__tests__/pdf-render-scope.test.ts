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

it.each([
  [undefined, undefined, "#0054d1"],
  [undefined, "#974420", "#974420"],
  ["", "#974420", "#414141"],
  ["invalid", "#974420", "#414141"],
  ["{}", "#974420", "#414141"],
  ['{"cssVariables":{"--sjs-general-forecolor":"#123"}}', "#974420", "#414141"],
  ['{"cssVariables":{"--sjs-primary-backcolor":"#345"}}', "#974420", "#334455"],
])("selects the table band for theme %s and deployment %s", (themeModel, deploymentAccent, expected) => {
  // Act
  const styles = withPdfStyles({ themeModel }, currentPdfStyles, deploymentAccent);
  // Assert
  expect(styles.table.tableHeader.backgroundColor).toBe(expected);
});

it("keeps white form paper visible through the header but distinct from its label and note", () => {
  // Arrange
  const definition = { themeModel: JSON.stringify({ cssVariables: { "--sjs-general-backcolor": "#fff" } }) };
  // Act
  const { table } = withPdfStyles(definition, currentPdfStyles, "#974420");
  // Assert
  expect(table).toEqual(withPdfStyles(definition, currentPdfStyles).table);
  expect(table.tableHeader.backgroundColor).toBe("transparent");
  expect(new Set(["#ffffff", table.fieldLabel.backgroundColor, table.noteSurface.backgroundColor]).size).toBe(3);
});

it("keeps overlapping exports' styles separate across async rendering", async () => {
  // Arrange
  const ready = Promise.withResolvers<void>();
  const outside = currentPdfStyles();
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
  expect(currentPdfStyles()).toBe(outside);
});
