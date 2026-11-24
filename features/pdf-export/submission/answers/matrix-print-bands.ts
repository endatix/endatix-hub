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
export const LINE_HEIGHT = 12;
export const MATRIX_LINE_STYLE = { lineHeight: `${LINE_HEIGHT}pt` };
export const CELL_EDGES = tableCell.padding * 2 + tableCell.borderWidth;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export async function loadMatrixFonts() {
  await Promise.all(
    [tableCell.fontFamily, tableCellHeader.fontFamily, "Helvetica"].map(
      (fontFamily) => Font.load({ fontFamily }),
    ),
  );
}

export function typesetter(width: number, family: string) {
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
export function measureSource(width: number, family: string) {
  const measure = typesetter(width, family);
  const available = width - CELL_EDGES;
  const withinWidth = (lines: ReturnType<typeof measure>) =>
    lines.every((line) => (line.xAdvance ?? 0) <= available);
  const fits = (word: string) => {
    const lines = measure(word);
    return lines.length === 1 && withinWidth(lines);
  };
  return (source: string): TextBlock => {
    const lines = measure(source);
    if (withinWidth(lines)) return { text: source, lines: lines.length };
    const text = source.replace(/\S+/gu, (word) =>
      withinWidth(measure(word)) ? word : breakWideToken(word, fits).join("\n"),
    );
    return { text, lines: measure(text).length };
  };
}

type Measure = ReturnType<typeof measureSource>;

function splitSource(
  block: TextBlock,
  measure: Measure,
  limit: number,
): TextBlock[] {
  if (block.lines <= limit) return [block];
  const chunks: TextBlock[] = [];
  let current = measure("");
  for (const part of block.text.split(/(?<=\n)/u)) {
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
  paragraph?: { column: number; source: string };
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

function fragmentShortParagraphs(
  row: PdfMatrixTableRow,
  columns: PdfMatrixTableColumn[],
  layout: RowLayout,
) {
  const { labels, cells } = measureRow(row, columns, layout);
  const count = Math.max(labels.count, ...cells.map((parts) => parts.length));
  return Array.from({ length: count }, (_, i) => {
    const name = labels.at(i);
    const part = cells.map((parts) => parts[i]);
    const lineCount = Math.max(name.lines, ...part.map(p => p?.lines ?? 0));
    return {
      key: `${row.key}:${i}`,
      label: name.text,
      height: rowHeight(lineCount),
      cells: columns.map(({ key }, j) => ({ key, title: part[j]?.text ?? "" })),
    };
  });
}

// A paragraph is the unit of bidi resolution, not a word or a printed line.
// Let React-PDF paginate its original Text node if it cannot fit in one band.
function paragraphNeedsFlow(
  source: string,
  shape: ReturnType<typeof typesetter>,
  layout: RowLayout,
) {
  const lines = shape(source);
  if (lines.length > layout.limit) return true;
  return lines.some(line => (line.xAdvance ?? 0) > layout.width - CELL_EDGES
    && line.runs.some(run => (run.attributes.bidiLevel ?? 0) > 0));
}

export function nativeWordBreaks(width: number) {
  const shape = typesetter(width, tableCell.fontFamily);
  return (word: string, fallback?: (word: string) => string[]) =>
    shape(word).some((line) => (line.xAdvance ?? 0) > width - CELL_EDGES)
      ? Array.from(graphemes.segment(word), ({ segment }) => segment)
      : (fallback?.(word) ?? [word]);
}

function fragmentRow(
  row: PdfMatrixTableRow,
  columns: PdfMatrixTableColumn[],
  layout: RowLayout,
) {
  const shape = typesetter(layout.width, tableCell.fontFamily);
  const sources = [row.label, ...columns.map((c) => row.cells[c.key] ?? "")];
  const markerLines = shape(`Row ${layout.ordinal} (cont.)`).length;
  const native = sources.flatMap((source, column) => {
    const limit = column === 0 ? layout.limit - markerLines : layout.limit;
    return source
      .split("\n")
      .some((p) => paragraphNeedsFlow(p, shape, { ...layout, limit }))
      ? [{ column, source }]
      : [];
  });
  if (!native.length) return fragmentShortParagraphs(row, columns, layout);
  return rowWithParagraphs(row, columns, { native, layout });
}

function rowWithParagraphs(
  row: PdfMatrixTableRow,
  columns: PdfMatrixTableColumn[],
  options: {
    native: { column: number; source: string }[];
    layout: RowLayout;
  },
): PrintRow[] {
  const { native, layout } = options;
  const measure = measureSource(layout.width, tableCell.fontFamily);
  const stub = summaryRow(row, columns, native);
  const start = fragmentShortParagraphs(stub, columns, layout);
  const name = `Row ${layout.ordinal}`;
  if (start.length === 1) identifySummary(start[0], name, measure);
  const shortName = measure(stub.label).lines <= 2 ? stub.label : "";
  const label = [`${name} (cont.)`, shortName].filter(Boolean).join("\n");
  return [...start, ...native.map(paragraph => ({
    key: `${row.key}:paragraph:${paragraph.column}`, height: 0, cells: [], label, paragraph,
  }))];
}

function summaryRow(row: PdfMatrixTableRow, columns: PdfMatrixTableColumn[], native: {column: number}[]) {
  const stub = { ...row, cells: { ...row.cells } };
  for (const { column } of native) {
    if (column === 0) stub.label = "";
    else stub.cells[columns[column - 1].key] = "See below";
  }
  return stub;
}

function identifySummary(row: PrintRow, name: string, measure: Measure) {
  row.label = [name, row.label].filter(Boolean).join("\n");
  row.height = Math.max(row.height, rowHeight(measure(row.label).lines));
}

function packRows(rows: PrintRow[], capacity: number) {
  const bands: PrintRow[][] = [];
  let remaining = 0;
  for (const row of rows) {
    if (row.paragraph) {
      bands.push([row]);
      remaining = 0;
      continue;
    }
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
