import { createElement as el, type ReactNode } from "react";
import { Document, Font, Page, Text, View, pdf } from "@react-pdf/renderer";
import { expect, it, vi } from "vitest";
import { PdfMatrixTable } from "../answers/pdf-matrix-table";

Font.register({
  family: "Roboto",
  src: `${process.cwd()}/public/fonts/Roboto-Regular.ttf`,
});
Font.register({
  family: "Roboto-Bold",
  src: `${process.cwd()}/public/fonts/Roboto-Bold.ttf`,
});

const columns = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"].map(
  (title) => ({ key: title, title }),
);
const rows = Array.from({ length: 72 }, (_, i) => ({
  key: `r${i}`,
  label: `Station-${i}`,
  cells: { [columns[i % columns.length].key]: "X" },
}));

interface LayoutNode {
  lines?: { string: string }[];
  children?: LayoutNode[];
}

function lines(node: LayoutNode): string[] {
  return (
    node.lines?.map((line) => line.string) ??
    node.children?.flatMap((child) => lines(child)) ??
    []
  );
}

async function printedPages(
  table = { columns, rows },
  lead: ReactNode = el(Text, { break: true }, "Matrix question"),
) {
  // react-pdf supplies its paginated layout to Document.onRender after writing the PDF.
  const onRender = vi.fn();
  const document = el(
    Document,
    { onRender },
    el(
      Page,
      { size: "A4", style: { padding: 24 } },
      el(Text, null, "Before question"),
      lead,
      el(PdfMatrixTable, table),
      el(Text, { break: true }, "After question"),
    ),
  );
  await pdf(document).toBlob();
  const layout: LayoutNode[] =
    onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_.children;
  return layout.map((page) => lines(page));
}

it("repeats column titles on every matrix page and never on neighboring questions' pages", async () => {
  // Act
  const pages = await printedPages();
  const matrixPages = pages.filter((page) =>
    page.some((line) => line.startsWith("Station-")),
  );

  // Assert
  expect(pages[0]).toEqual(["Before question"]);
  expect(pages.at(-1)).toEqual(["After question"]);
  expect(matrixPages.length).toBeGreaterThan(1);
  for (const page of matrixPages) {
    for (const { title } of columns)
      expect(page.filter((line) => line === title)).toHaveLength(1);
  }
  expect(
    matrixPages.flat().filter((line) => line.startsWith("Station-")),
  ).toHaveLength(rows.length);
});

it("keeps a header out of a preceding page with only a few points left", async () => {
  // Act
  const pages = await printedPages(
    { columns, rows },
    el(View, { style: { height: 765 } }),
  );
  // Assert
  expect(pages[0]).toEqual(["Before question"]);
});

it("finishes oversized titles and cells without clipping or duplicating their lines", async () => {
  // Arrange
  const markers = Array.from({ length: 150 }, (_, i) => `Line-${i}`);
  const longTitle = Array.from({ length: 150 }, (_, i) => `Term-${i}`).join(
    "\n",
  );
  const tallColumns = columns.map((c, i) =>
    i === 0 ? { ...c, title: longTitle } : c,
  );
  const tallRows = [
    { key: "tall", label: "Tall row", cells: { First: markers.join("\n") } },
  ];
  // Act
  const pages = await printedPages({ columns: tallColumns, rows: tallRows });
  const printed = pages.flat();
  // Assert
  expect(pages.length).toBeLessThan(15);
  expect(printed).toContain("Term-149");
  expect(printed.filter((line) => line.startsWith("Line-"))).toEqual(markers);
  for (const page of pages.filter((p) =>
    p.some((line) => line.startsWith("Line-")),
  )) {
    expect(page).toContain("Column 1");
    expect(page).toContain("Sixth");
  }
});
