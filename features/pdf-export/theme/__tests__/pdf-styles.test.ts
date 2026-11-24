import { expect, it } from "vitest";
import { PDF_STYLES, PDF_TABLE_STYLES } from "../../submission/pdf-styles";
import { createPdfStyles } from "../pdf-styles";
import { contrastRatio, parseCssColor } from "@/lib/branding/color";

it.each(["#493669", "#ffeecc"])("keeps print headings readable on form surface %s", (surface) => {
  // Arrange & Act
  const { table } = createPdfStyles({ tableHeaderBackground: surface });
  // Assert
  const ink = parseCssColor(table.tableCellHeader.color);
  expect(contrastRatio(ink!, parseCssColor(surface)!)).toBeGreaterThanOrEqual(4.5);
});

it("reads a translucent heading against the paper beneath it", () => {
  // Arrange & Act
  const { table } = createPdfStyles({tableHeaderBackground: "#00000020", text: "#ffffff"});
  // Assert
  expect(table.tableCellHeader.color).toBe("#000000");
});

it("reads section titles and properties on opposite paper and panel surfaces", () => {
  // Arrange & Act
  const { body, properties } = createPdfStyles({
    pageBackground: "#ffffff", tableHeaderBackground: "#000000", accent: "#ffffff",
  });
  // Assert
  expect(body.sectionTitle.color).toBe("#000000");
  expect(properties.title.color).toBe("#ffffff");
  expect(properties.label.color).toBe("#ffffff");
  expect(properties.value.color).toBe("#ffffff");
});

it("lets the dark page show through panels and table headers without a surface token", () => {
  // Arrange & Act
  const styles = createPdfStyles({ pageBackground: "#121212", text: "#ffffff" });

  // Assert
  expect(styles.panel.backgroundColor).toBe("transparent");
  expect(styles.table.tableHeader.backgroundColor).toBe("transparent");
  expect(styles.muted.color).toBe("#ffffff");
});

it.each([
  [{pageBackground: "#121212"}, "#ffffff"],
  [{pageBackground: "#121212", text: "#222222"}, "#ffffff"],
  [{pageBackground: "#121212", text: "#ddddee"}, "#ddddee"],
  [{pageBackground: "#00000020"}, "#000000"],
])("resolves inherited ink on the painted page: %j", (theme, ink) => {
  expect(createPdfStyles(theme).page.color).toBe(ink);
});

it("keeps the default page unpainted and reuses the print geometry", () => {
  // Act & Assert
  const styles = createPdfStyles({});
  expect(styles.page).toEqual({});
  expect(styles).toMatchObject({
    panel: {},
    text: {},
    muted: {},
    divider: {},
    body: {sectionTitle: PDF_STYLES.sectionTitle},
    table: {tableCell: PDF_TABLE_STYLES.tableCell},
  });
});

it("applies the form's ink, paper, borders and corner radius", () => {
  // Act
  const styles = createPdfStyles({
    text: "#112233",
    pageBackground: "#ddeeff",
    tableBorder: "#abcabc",
    radius: 8,
  });
  // Assert
  expect(styles.page).toEqual({ color: "#112233", backgroundColor: "#ddeeff" });
  expect(styles.body.mutedBorder.borderRadius).toBe(8);
  expect(styles.table.tableCell.borderColor).toBe("#abcabc");
});
