import { Font } from "@react-pdf/renderer";
import layoutEngine, {
  bidi,
  fontSubstitution,
  fromFragments,
  justification,
  linebreaker,
  scriptItemizer,
  textDecoration,
  wordHyphenation,
} from "@react-pdf/textkit";
import { MATRIX_LABEL_COLUMN_WIDTH, PDF_TABLE_STYLES } from "../pdf-styles";
import type {
  PdfMatrixTableColumn,
  PdfMatrixTableRow,
} from "./pdf-matrix-table";

const typeset = layoutEngine({
  bidi,
  fontSubstitution,
  justification,
  linebreaker,
  scriptItemizer,
  textDecoration,
  wordHyphenation,
});
const { tableCell, tableCellHeader, tableRow } = PDF_TABLE_STYLES;
// A band is independently placeable on A4. Short matrices need only one legend.
const BAND_HEIGHT = 260;
const LINE_HEIGHT = 12;
export const MATRIX_LINE_STYLE = { lineHeight: `${LINE_HEIGHT}pt` };
const CELL_EDGES = tableCell.padding * 2 + tableCell.borderWidth;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export async function loadMatrixFonts() {
  await Promise.all(
    [tableCell.fontFamily, tableCellHeader.fontFamily, "Helvetica"].map(
      (fontFamily) => Font.load({ fontFamily }),
    ),
  );
}

function typesetter(width: number, family: string) {
  const font = [family, "Helvetica"].map(
    (fontFamily) => Font.getFont({ fontFamily }).data!,
  );
  const attributes = {
    font,
    fontSize: tableCell.fontSize,
    lineHeight: LINE_HEIGHT,
  };
  const box = { x: 0, y: 0, width: width - CELL_EDGES, height: Infinity };
  return (text: string) =>
    typeset(fromFragments([{ string: text, attributes }]), box, {
      shrinkWhitespaceFactor: { before: -0.5, after: -0.5 },
    }).flat();
}

function breakWideToken(text: string, fits: (value: string) => boolean) {
  const lines: string[] = [];
  let current = "";
  for (const { segment } of graphemes.segment(text)) {
    if (current && !fits(current + segment)) {
      lines.push(current);
      current = "";
    }
    current += segment;
  }
  return [...lines, current];
}

function visualLines(text: string, width: number, family: string) {
  const measure = typesetter(width, family);
  const available = width - CELL_EDGES;
  const fits = (value: string) => {
    const lines = measure(value);
    return lines.length === 1 && (lines[0].xAdvance ?? 0) <= available;
  };
  return measure(text).flatMap((line) =>
    (line.xAdvance ?? 0) <= available
      ? [line.string.trimEnd()]
      : breakWideToken(line.string.trimEnd(), fits),
  );
}

function rowHeight(lines: number) {
  return Math.max(tableRow.minHeight, lines * LINE_HEIGHT + CELL_EDGES);
}

function columnLegend(columns: PdfMatrixTableColumn[], width: number) {
  return columns.map((column, index) => {
    const lines = visualLines(column.title, width, tableCellHeader.fontFamily);
    const height = rowHeight(lines.length);
    if (height <= BAND_HEIGHT / 2)
      return { ...column, title: lines.join("\n"), height, description: "" };
    const title = `Column ${index + 1}`;
    const description = visualLines(
      `${title}: ${column.title}`,
      width * columns.length,
      tableCell.fontFamily,
    ).join("\n");
    return { key: column.key, title, height: rowHeight(1), description };
  });
}

interface PrintRow {
  key: string;
  label: string;
  cells: PdfMatrixTableColumn[];
  height: number;
}

function measureRow(row: PdfMatrixTableRow, columns: PdfMatrixTableColumn[], width: number) {
  const label = visualLines(
    row.label,
    MATRIX_LABEL_COLUMN_WIDTH,
    tableCell.fontFamily,
  );
  const cells = columns.map((c) =>
    visualLines(row.cells[c.key] ?? "", width, tableCell.fontFamily),
  );
  const lineCount = Math.max(1, label.length, ...cells.map((c) => c.length));
  return { label, cells, lineCount };
}

function fragmentRow(row: PdfMatrixTableRow, columns: PdfMatrixTableColumn[], layout: { width: number; maxLines: number }) {
  const { width, maxLines } = layout;
  const { label, cells, lineCount } = measureRow(row, columns, width);
  return Array.from({ length: Math.ceil(lineCount / maxLines) }, (_, i) => {
    const start = i * maxLines;
    const fragment = (lines: string[]) =>
      lines.slice(start, start + maxLines).join("\n");
    return {
      key: `${row.key}:${start}`,
      label: fragment(label),
      cells: columns.map((c, j) => ({ key: c.key, title: fragment(cells[j]) })),
      height: rowHeight(Math.min(maxLines, lineCount - start)),
    };
  });
}

function packRows(rows: PrintRow[], capacity: number) {
  const bands: PrintRow[][] = [];
  let remaining = 0;
  for (const row of rows) {
    if (remaining < row.height) {
      bands.push([]);
      remaining = capacity;
    }
    bands.at(-1)!.push(row);
    remaining -= row.height;
  }
  return bands;
}

export function matrixPrintBands(
  columns: PdfMatrixTableColumn[],
  rows: PdfMatrixTableRow[],
  width: number,
) {
  const legend = columnLegend(columns, width);
  const capacity =
    BAND_HEIGHT -
    Math.max(...legend.map((c) => c.height)) -
    tableCellHeader.borderWidth;
  const maxLines = Math.floor((capacity - CELL_EDGES) / LINE_HEIGHT);
  const fragments = rows.flatMap((row) =>
    fragmentRow(row, columns, { width, maxLines }),
  );
  return { legend, bands: packRows(fragments, capacity) };
}
