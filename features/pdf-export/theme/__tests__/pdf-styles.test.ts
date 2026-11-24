import { expect, it } from "vitest";
import { PDF_STYLES, PDF_TABLE_STYLES } from "../../submission/pdf-styles";
import { createPdfStyles } from "../pdf-styles";
import { contrastRatio, parseCssColor } from "@/lib/branding/color";

it("tints the label rail, properties and note from the print accent", () => {
  // Arrange & Act
  const { table, panel } = createPdfStyles({ accent: "#0054d1" });
  // Assert
  expect(table.fieldLabel.backgroundColor).toBe("#dbe7f9");
  expect(panel.backgroundColor).toBe(table.fieldLabel.backgroundColor);
  expect(table.noteSurface.backgroundColor).toBe("#cdc4f4");
  expect(table.table.borderColor).not.toBe(PDF_TABLE_STYLES.table.borderColor);
});

it.each(["#f4e7af", "#777777", "#009245", "#cc241a"])("keeps every tinted surface readable for accent %s", (accent) => {
  // Act
  const { body, page, muted, properties, panel, table } = createPdfStyles({}, accent);
  const pairs = [
    [page.color, "#ffffff"], [muted.color, "#ffffff"], [body.sectionTitle.color, "#ffffff"],
    [table.tableCellHeader.color, table.tableHeader.backgroundColor],
    [table.fieldLabel.color, table.fieldLabel.backgroundColor],
    [table.noteHeading.color, table.noteSurface.backgroundColor],
    [table.noteText.color, table.noteSurface.backgroundColor],
    ...Object.values(properties).map(({ color }) => [color, panel.backgroundColor]),
  ];
  // Assert
  for (const [ink, surface] of pairs)
    expect(contrastRatio(parseCssColor(ink)!, parseCssColor(surface)!)).toBeGreaterThanOrEqual(4.5);
});

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

it("preserves readable translucent form ink over the actual header", () => {
  const { table } = createPdfStyles({ text: "#ffffff80", tableHeaderBackground: "#000000" });
  expect(table.tableCellHeader.color).toBe("#808080");
});

it("keeps authored label ink only if it passes on the emitted tint", () => {
  const { table } = createPdfStyles({ accent: "#4d65b7" });
  const { color, backgroundColor } = table.fieldLabel;
  expect(contrastRatio(parseCssColor(color)!, parseCssColor(backgroundColor)!)).toBeGreaterThanOrEqual(4.5);
});

it("uses the form's readable text for note headings without a form accent", () => {
  expect(createPdfStyles({ text: "#123456" }).table.noteHeading.color).toBe("#123456");
});

it("retains a visible band and tint when a deployment chooses pure white", () => {
  const { table } = createPdfStyles({}, "#ffffff");
  expect(table.tableHeader.backgroundColor).not.toBe("#ffffff");
  expect(table.fieldLabel.backgroundColor).not.toBe(table.tableHeader.backgroundColor);
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
  [{pageBackground: "#00000020", text: "#123456"}, "#123456"],
])("resolves inherited ink on the painted page: %j", (theme, ink) => {
  expect(createPdfStyles(theme).page.color).toBe(ink);
});

it("keeps the default page unpainted and reuses the print geometry", () => {
  // Act & Assert
  const styles = createPdfStyles({});
  expect(styles.page).not.toHaveProperty("backgroundColor");
  expect(styles.body.sectionTitle).toMatchObject(PDF_STYLES.sectionTitle);
  expect(styles.table.tableCell).toMatchObject({
    ...PDF_TABLE_STYLES.tableCell, borderColor: expect.any(String),
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
