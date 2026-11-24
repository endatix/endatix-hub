import { createElement as el, type ReactNode } from "react";
import { Document, Font, Page, Text, View, pdf } from "@react-pdf/renderer";
import { expect, it, vi } from "vitest";
import { PdfMatrixTable } from "../answers/pdf-matrix-table";
import { loadMatrixFonts } from "../answers/matrix-print-bands";

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
  box: { top: number };
  lines?: { string: string; box: { y: number; height: number } }[];
  children?: LayoutNode[];
}

function lines(node: LayoutNode, parentTop = 0): string[] {
  const top = parentTop + node.box.top;
  if (!node.lines)
    return node.children?.flatMap((child) => lines(child, top)) ?? [];
  for (const line of node.lines) {
    const y = top + line.box.y - node.lines[0].box.y;
    expect(y + line.box.height).toBeLessThanOrEqual(818);
  }
  return node.lines.map((line) => line.string);
}

async function printedPages(
  table = { columns, rows },
  lead: ReactNode = el(Text, { break: true }, "Matrix question"),
  frameWidth?: number,
) {
  await loadMatrixFonts();
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
      frameWidth
        ? el(View, { style: { width: frameWidth } }, el(PdfMatrixTable, table))
        : el(PdfMatrixTable, table),
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
    for (const { title } of columns) expect(page).toContain(title);
  }
  expect(
    matrixPages.flat().filter((line) => line.startsWith("Station-")),
  ).toEqual(rows.map((row) => row.label));
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

it.each([665, 680, 690])(
  "moves the header with its multiline first row after a %i pt spacer",
  async (height) => {
    // Arrange
    const first = {
      ...rows[0],
      cells: { First: "One\nTwo\nThree\nFour\nFive\nSix\nSeven" },
    };

    // Act
    const pages = await printedPages(
      { columns, rows: [first, ...rows.slice(1)] },
      el(View, { style: { height } }),
    );

    // Assert
    expect(pages[0]).toEqual(["Before question"]);
    expect(pages[1]).toContain("First");
    expect(pages[1]).toContain("Seven");
  },
);

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
    expect(page).toContain("Tall row");
  }
});

it("keeps every character of a long unbroken identifier in its own column", async () => {
  // Arrange
  const identifier = "W".repeat(150);
  const row = { ...rows[0], cells: { First: identifier } };
  // Act
  const pages = await printedPages({ columns, rows: [row] });
  // Assert — each W is about 9 pt in the stock font; eight cannot fit in this cell.
  const lines = pages.flat().filter((line) => /^W+$/u.test(line));
  expect(lines.join("")).toBe(identifier);
  for (const line of lines) expect(line.length).toBeLessThan(8);
});

it("starts a flowing first row with its legend, not in a sliver above the page break", async () => {
  // Arrange
  const first = { ...rows[0], cells: { First: "Printed line\n".repeat(150) } };

  // Act
  const pages = await printedPages(
    { columns, rows: [first] },
    el(View, { style: { height: 765 } }),
  );

  // Assert
  expect(pages[0]).toEqual(["Before question"]);
  for (const page of pages.filter((p) => p.includes("Sixth")))
    expect(page).toContain("Printed line");
});

it.each([false, true])(
  "matches the ordinary grid's printed bidi order (soft-wrapped: %s)",
  async (wrapped) => {
    const run = "\u200f(12)-(34)\u200f";
    // Match the actual cell widths so natural line breaks are comparable.
    const label = wrapped
      ? `Alpha ${run} Bravo ${run} Charlie ${run}`
      : "Sample";
    const sample = [
      { ...rows[0], label, cells: { First: wrapped ? "X" : run } },
    ];
    const output = async (width: number) =>
      (
        await printedPages(
          {
            columns: columns.slice(0, width),
            rows: sample,
          },
          undefined,
          1 + (width + 1) * 77,
        )
      )
        .flat()
        .filter((line) => /[()]/u.test(line));
    const reference = await output(5);
    expect(reference.length).toBeGreaterThan(wrapped ? 1 : 0);
    expect(await output(6)).toEqual(reference);
  },
);

const numericParagraph = (pairs: number, mark: string) =>
  mark + Array(pairs).fill("1234 5678").join(" ") + mark;

it.each([
  numericParagraph(32, "\u200f"),
  numericParagraph(32, "\u200e"),
  "\u200f" + "12 ABC \u206634 56\u2069 ".repeat(60) + "\u200f",
])(
  "retains the ordinary grid's paragraph ordering across a band boundary",
  async (source) => {
    const rows = [{ key: "sample", label: "Sample", cells: { First: source } }];
    const printed = async (n: number) =>
      (
        await printedPages(
          { columns: columns.slice(0, n), rows },
          undefined,
          1 + (n + 1) * 77,
        )
      )
        .flat()
        .filter((line) => /[2-8]/u.test(line));
    const expected = await printed(5);
    expect(expected.length).toBeGreaterThan(19);
    expect(await printed(6)).toEqual(expected);
  },
);

it("keeps the RTL context and row key on every physical continuation", async () => {
  const rows = [
    {
      key: "north",
      label: "North",
      cells: { First: numericParagraph(128, "\u200f") },
    },
  ];
  const pages = await printedPages({ columns, rows }, undefined, 540);
  const answers = pages.filter((page) =>
    page.some((line) => line.includes("5678")),
  );
  expect(answers.length).toBeGreaterThan(1);
  for (const page of answers) {
    expect(page).toEqual(
      expect.arrayContaining(["Row 1 (cont.)", "North", "First", "Sixth"]),
    );
  }
  expect(
    answers
      .flat()
      .filter((line) => line.includes("5678"))
      .map((line) => line.replace(/\D/gu, "")),
  ).toEqual(Array(128).fill("56781234"));
});

it("identifies continued answers even after the row label has finished printing", async () => {
  const labels = Array.from({ length: 90 }, (_, i) => `Label-${i}`);
  const answers = Array.from({ length: 150 }, (_, i) => `Answer-${i}`);
  const sample = [
    {
      key: "id",
      label: labels.join("\n"),
      cells: { First: answers.join("\n") },
    },
  ];
  const pages = (await printedPages({ columns, rows: sample })).filter((p) =>
    p.some((l) => l.startsWith("Answer-")),
  );
  expect(pages.flat().filter((l) => l.startsWith("Label-"))).toEqual(labels);
  expect(pages.flat().filter((l) => l.startsWith("Answer-"))).toEqual(answers);
  expect(pages[0]).toContain("Row 1");
  for (const page of pages.slice(1)) expect(page).toContain("Row 1 (cont.)");
});

it.each([0, 220, 665, 680, 690, 765])(
  "prints every wrapped word of the dense grid after %i pt of content",
  async (height) => {
    // Arrange
    const title = "WWWW ".repeat(9) + "WWW";
    const denseColumns = columns.map((column) => ({ ...column, title }));
    const denseRows = columns.map(({ key }, i) => ({
      key,
      label: `Dense-${i}`,
      cells: { [key]: title },
    }));

    // Act
    const pages = await printedPages(
      { columns: denseColumns, rows: denseRows },
      el(View, { style: { height } }),
    );

    // Assert — subtract the six repeated titles to count only answer glyphs.
    const gridPages = pages.filter((page) =>
      page.some((line) => line.includes("W")),
    );
    const letters = (lines: string[]) =>
      lines.join("").match(/W/g)?.length ?? 0;
    const titleLetters = letters([title]);
    for (const page of gridPages)
      expect(letters(page)).toBeGreaterThan(6 * titleLetters);
    expect(letters(gridPages.flat())).toBe(
      (gridPages.flat().filter((line) => line === " ").length + 1) *
        6 *
        titleLetters,
    );
    expect(pages.flat().filter((line) => line.startsWith("Dense-"))).toEqual(
      denseRows.map((row) => row.label),
    );
  },
);

it.each([5, 7])(
  "retains the existing layout for %i data columns",
  async (count) => {
    // Arrange
    const choices = [...columns, { key: "Last", title: "Last" }].slice(
      0,
      count,
    );
    // Act
    const pages = await printedPages({ columns: choices, rows: [rows[0]] });
    // Assert
    const printed = pages.flat();
    expect(printed).toContain("Station-0");
    if (count === 7) expect(printed).toContain("First: X");
    else
      expect(printed).toEqual(expect.arrayContaining(["First", "Fifth", "X"]));
  },
);
