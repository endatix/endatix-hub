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
import { PDF_TABLE_STYLES } from "../pdf-styles";
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

interface TextBlock {
  text: string;
  lines: number;
}

// Textkit returns display-order glyphs. Only use their geometry: React-PDF
// needs the logical source (including direction marks) to shape the final PDF.
function measureSource(width: number, family: string) {
  const measure = typesetter(width, family);
  const available = width - CELL_EDGES;
  const withinWidth = (line: { xAdvance?: number }) =>
    (line.xAdvance ?? 0) <= available;
  const fits = (word: string) => {
    const lines = measure(word);
    return lines.length === 1 && lines.every(withinWidth);
  };
  return (source: string): TextBlock => {
    const lines = measure(source);
    if (lines.every(withinWidth)) return { text: source, lines: lines.length };
    const text = source.replace(/\S+/gu, (word) =>
      measure(word).every(withinWidth)
        ? word
        : breakWideToken(word, fits).join("\n"),
    );
    return { text, lines: measure(text).length };
  };
}

type Measure = ReturnType<typeof measureSource>;

function* sourceTokens(source: string, measure: Measure, limit: number) {
  for (const [token] of source.matchAll(/\S+[^\S\n]*\n?|[^\S\n]+|\n/gu)) {
    if (measure(token).lines <= limit) yield token;
    else yield* Array.from(graphemes.segment(token), ({ segment }) => segment);
  }
}

function splitSource(
  block: TextBlock,
  measure: Measure,
  limit: number,
): TextBlock[] {
  if (block.lines <= limit) return [block];
  const chunks: TextBlock[] = [];
  let current = measure("");
  for (const part of sourceTokens(block.text, measure, limit)) {
    const next = measure(current.text + part);
    if (next.lines <= limit || !current.text) current = next;
    else {
      chunks.push(current);
      current = measure(part);
    }
  }
  return [...chunks, current];
}

function rowHeight(lines: number) {
  return Math.max(tableRow.minHeight, lines * LINE_HEIGHT + CELL_EDGES);
}

function columnLegend(columns: PdfMatrixTableColumn[], width: number) {
  return columns.map((column, index) => {
    const block = measureSource(
      width,
      tableCellHeader.fontFamily,
    )(column.title);
    const height = rowHeight(block.lines);
    if (height <= BAND_HEIGHT / 2)
      return { ...column, title: block.text, height, description: "" };
    const title = `Column ${index + 1}`;
    const { text: description } = measureSource(
      width * columns.length,
      tableCell.fontFamily,
    )(`${title}: ${column.title}`);
    return { key: column.key, title, height: rowHeight(1), description };
  });
}

interface PrintRow {
  key: string;
  label: string;
  cells: PdfMatrixTableColumn[];
  height: number;
}

interface RowLayout {
  width: number;
  limit: number;
  ordinal: number;
}

function rowLabels(
  label: TextBlock,
  measure: Measure,
  options: { ordinal: number; limit: number },
) {
  const prefix = `Row ${options.ordinal}`;
  const continued = `${prefix} (cont.)`;
  const parts = splitSource(
    label,
    measure,
    options.limit - measure(continued).lines,
  );
  const at = (index: number) => {
    const content = parts[index]?.text ?? (label.lines <= 2 ? label.text : "");
    return measure(
      [index === 0 ? prefix : continued, content].filter(Boolean).join("\n"),
    );
  };
  return { count: parts.length, at };
}

function measureRow(
  row: PdfMatrixTableRow,
  columns: PdfMatrixTableColumn[],
  layout: RowLayout,
) {
  // The running grid's flex cells share the printable width, label included.
  const measure = measureSource(layout.width, tableCell.fontFamily);
  const label = measure(row.label);
  const cells = columns.map((c) =>
    splitSource(measure(row.cells[c.key] ?? ""), measure, layout.limit),
  );
  const split =
    label.lines > layout.limit || cells.some((parts) => parts.length > 1);
  const labels = split
    ? rowLabels(label, measure, layout)
    : { count: 1, at: () => label };
  return { labels, cells };
}

function fragmentRow(
  row: PdfMatrixTableRow,
  columns: PdfMatrixTableColumn[],
  layout: RowLayout,
) {
  const { labels, cells } = measureRow(row, columns, layout);
  const count = Math.max(labels.count, ...cells.map(parts => parts.length));
  return Array.from({ length: count }, (_, i) => {
    const name = labels.at(i);
    const part = cells.map((parts) => parts[i]);
    const height = rowHeight(Math.max(name.lines, ...part.map(p => p?.lines ?? 0)));
    return {
      key: `${row.key}:${i}`,
      label: name.text,
      height,
      cells: columns.map(({key}, j) => ({ key, title: part[j]?.text ?? "" })),
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
  const fragments = rows.flatMap((row, i) =>
    fragmentRow(row, columns, { width, limit: maxLines, ordinal: i + 1 }),
  );
  return { legend, bands: packRows(fragments, capacity) };
}
