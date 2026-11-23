import { expect, it } from "vitest";
import { PDF_STYLES, PDF_TABLE_STYLES } from "../../submission/pdf-styles";
import { createPdfStyles } from "../pdf-styles";

it("preserves the original styles including omitted page colours", () => {
  // Act & Assert
  expect(createPdfStyles({})).toEqual({
    page: {},
    panel: {},
    text: {},
    muted: {},
    divider: {},
    body: PDF_STYLES,
    table: PDF_TABLE_STYLES,
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
