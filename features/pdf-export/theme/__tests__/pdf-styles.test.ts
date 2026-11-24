import { expect, it } from "vitest";
import { PDF_STYLES, PDF_TABLE_STYLES } from "../../submission/pdf-styles";
import { createPdfStyles } from "../pdf-styles";
import { contrastRatio, parseCssColor } from "@/lib/branding/color";

it.each(["#493669", "#ffeecc"])("keeps print headings readable on form surface %s", (surface) => {
  const { table } = createPdfStyles({ tableHeaderBackground: surface });
  const ink = parseCssColor(table.tableCellHeader.color);
  expect(contrastRatio(ink!, parseCssColor(surface)!)).toBeGreaterThanOrEqual(4.5);
});

it("reads a translucent heading against the paper beneath it", () => {
  const { table } = createPdfStyles({tableHeaderBackground: "#00000020", text: "#ffffff"});
  expect(table.tableCellHeader.color).toBe("#000000");
});

it("lets the dark page show through panels and table headers without a surface token", () => {
  // Arrange & Act
  const styles = createPdfStyles({ pageBackground: "#121212", text: "#ffffff" });

  // Assert
  expect(styles.panel.backgroundColor).toBe("transparent");
  expect(styles.table.tableHeader.backgroundColor).toBe("transparent");
  expect(styles.muted.color).toBe("#ffffff");
});

it("keeps the default page unpainted and reuses the print geometry", () => {
  // Act & Assert
  expect(createPdfStyles({})).toMatchObject({
    page: {},
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
