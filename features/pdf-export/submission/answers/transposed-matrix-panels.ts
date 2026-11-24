import {
  MATRIX_LABEL_COLUMN_WIDTH,
  MATRIX_MIN_DATA_COLUMN_WIDTH,
  PDF_ANSWER_HEIGHT,
  PDF_TABLE_STYLES,
} from "../pdf-styles";
import type { MatrixDropdownTableData } from "./pdf-matrixdropdown-answer";
import type { PdfMatrixTableColumn } from "./pdf-matrix-table";
import {
  BAND_HEIGHT,
  CELL_EDGES,
  measureSource,
  packRows,
  rowHeight,
  typesetter,
} from "./matrix-print-bands";

const { tableCell, tableCellHeader } = PDF_TABLE_STYLES;
type Entry = PdfMatrixTableColumn & { width: number };
export type MatrixNote = { heading: string; source: string };

function preferredWidth(text: string, family: string, maximum: number) {
  const shape = typesetter(maximum, family);
  const lines = shape(text);
  if (lines.length === 1 && lines[0].runs.some(run => (run.attributes.bidiLevel ?? 0) > 0)) {
    return Math.min(maximum, Math.ceil((lines[0].xAdvance ?? 0) + CELL_EDGES + 1));
  }
  // A long narrative may need a note. Don't let it crowd out the short cells.
  if (lines.length > 6) return MATRIX_MIN_DATA_COLUMN_WIDTH;
  const words = text.split(/\s+/u).filter(Boolean);
  const widestWord = words.reduce(
    (max, word) =>
      Math.max(max, ...shape(word).map((line) => line.xAdvance ?? 0)),
    0,
  );
  const advances = lines.reduce((sum, line) => sum + (line.xAdvance ?? 0), 0);
  return Math.min(
    maximum,
    Math.ceil(Math.max(widestWord, advances / 3) + CELL_EDGES),
  );
}

function entryWidths(data: MatrixDropdownTableData, available: number) {
  const maximum = available / 2;
  return data.columns.map((entry) => {
    const heading = preferredWidth(
      entry.title,
      tableCellHeader.fontFamily,
      maximum,
    );
    const widths = data.rows.map((row) =>
      preferredWidth(row.cells[entry.key] ?? "", tableCell.fontFamily, maximum),
    );
    return {
      ...entry,
      width: Math.max(heading, MATRIX_MIN_DATA_COLUMN_WIDTH, ...widths),
    };
  });
}

function groupEntries(entries: Entry[], available: number) {
  const groups: Entry[][] = [];
  let remaining = 0;
  for (const entry of entries) {
    if (entry.width > remaining) {
      groups.push([]);
      remaining = available;
    }
    groups.at(-1)!.push(entry);
    remaining -= entry.width;
  }
  return groups;
}

function expandGroup(group: Entry[], available: number) {
  const extra =
    (available - group.reduce((sum, e) => sum + e.width, 0)) / group.length;
  return group.map((entry) => ({ ...entry, width: entry.width + extra }));
}

function noteBook() {
  const notes: MatrixNote[] = [];
  const reference = (source: string, identity = "") => {
    const ref = `[${notes.length + 1}]`;
    notes.push({
      heading: [ref, identity].filter(Boolean).join(" · "),
      source,
    });
    return ref;
  };
  return { notes, reference };
}

type Notes = ReturnType<typeof noteBook>;
type Block = ReturnType<ReturnType<typeof measureSource>>;
function runningLabel(block: Block, original: string, book: Notes) {
  return block.lines > 6 ? book.reference(original) : block.text;
}

function panelEntry(entry: Entry, book: Notes) {
  const block = measureSource(
    entry.width,
    tableCellHeader.fontFamily,
  )(entry.title);
  const title = runningLabel(block, entry.title, book);
  return {
    ...entry,
    title,
    height: rowHeight(title === block.text ? block.lines : 1),
  };
}

type Field = MatrixDropdownTableData["rows"][number] & { height: number };
function panelRow(
  row: Field,
  entries: Entry[],
  context: { book: Notes; capacity: number },
) {
  let height = row.height;
  const cells = entries.map((entry) => {
    const source = row.cells[entry.key] ?? "";
    const block = measureSource(entry.width, tableCell.fontFamily)(source);
    const needed = rowHeight(block.lines);
    if (needed > context.capacity)
      return context.book.reference(source, `${entry.title} · ${row.label}`);
    height = Math.max(height, needed);
    return block.text;
  });
  return { key: row.key, label: row.label, cells, height };
}

function fieldLabels(data: MatrixDropdownTableData, book: Notes) {
  const measure = measureSource(
    MATRIX_LABEL_COLUMN_WIDTH,
    PDF_TABLE_STYLES.fieldLabel.fontFamily,
  );
  return data.rows.map((row) => {
    const block = measure(row.label);
    const label = runningLabel(block, row.label, book);
    return {
      ...row,
      label,
      height: rowHeight(label === block.text ? block.lines : 1),
    };
  });
}

function tableBands(fields: Field[], entries: ReturnType<typeof panelEntry>[], book: Notes) {
  const header = Math.max(...entries.map(e => e.height)) + PDF_TABLE_STYLES.table.marginTop
    + PDF_TABLE_STYLES.table.borderWidth + PDF_TABLE_STYLES.tableHeader.borderBottomWidth;
  const capacity = PDF_ANSWER_HEIGHT - header;
  const rows = fields.map(field => panelRow(field, entries, {book, capacity}));
  return packRows(rows, BAND_HEIGHT - header);
}

export function transposedMatrixPanels(
  data: MatrixDropdownTableData,
  width: number,
) {
  const available =
    width - MATRIX_LABEL_COLUMN_WIDTH - PDF_TABLE_STYLES.table.borderWidth;
  const book = noteBook();
  const fields = fieldLabels(data, book);
  let start = 0;
  return groupEntries(entryWidths(data, available), available).map((group) => {
    const entries = expandGroup(group, available).map((e) =>
      panelEntry(e, book),
    );
    const bands = tableBands(fields, entries, book);
    const notes = book.notes.slice(start);
    start = book.notes.length;
    return { entries, bands, notes };
  });
}
