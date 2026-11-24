import { MATRIX_LABEL_COLUMN_WIDTH, MATRIX_MIN_DATA_COLUMN_WIDTH, PDF_TABLE_STYLES } from "../pdf-styles";
import type { MatrixDropdownTableData } from "./pdf-matrixdropdown-answer";
import type { PdfMatrixTableColumn } from "./pdf-matrix-table";
import { CELL_EDGES, LINE_HEIGHT, typesetter } from "./matrix-print-bands";

const { tableCell, tableCellHeader } = PDF_TABLE_STYLES;
type Entry = PdfMatrixTableColumn & { width: number };
export type MatrixNote = { heading: string; source: string };

function preferredWidth(text: string, family: string, maximum: number) {
  const lines = typesetter(maximum, family)(text);
  // A long narrative may need a note. Don't let it crowd out the short cells.
  if (lines.length > 6) return MATRIX_MIN_DATA_COLUMN_WIDTH;
  for (const width of [MATRIX_MIN_DATA_COLUMN_WIDTH, maximum / 2, maximum]) {
    const wrapped = typesetter(width, family)(text);
    if (wrapped.length <= 3 && wrapped.every(l => (l.xAdvance ?? 0) <= width - CELL_EDGES)) return width;
  }
  return maximum;
}

function entryWidths(data: MatrixDropdownTableData, available: number) {
  const maximum = available / 2;
  return data.columns.map(entry => {
    const heading = preferredWidth(entry.title, tableCellHeader.fontFamily, maximum);
    const widths = data.rows.map(row =>
      preferredWidth(row.cells[entry.key] ?? "", tableCell.fontFamily, maximum));
    return { ...entry, width: Math.max(heading, MATRIX_MIN_DATA_COLUMN_WIDTH, ...widths) };
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
  const extra = (available - group.reduce((sum, e) => sum + e.width, 0)) / group.length;
  return group.map(entry => ({ ...entry, width: entry.width + extra }));
}

function lineCount(source: string, entry: Entry) {
  const inner = entry.width - CELL_EDGES;
  return typesetter(entry.width, tableCell.fontFamily)(source).reduce(
    (sum, line) => sum + Math.max(1, Math.ceil((line.xAdvance ?? 0) / inner)), 0);
}

function panelRows(data: MatrixDropdownTableData, entries: Entry[], nextRef: () => string) {
  const notes: MatrixNote[] = [];
  const rows = data.rows.map(row => {
    const cells = entries.map(entry => {
      const source = row.cells[entry.key] ?? "";
      // Reserve space for the repeated headings and page margins.
      if (lineCount(source, entry) * LINE_HEIGHT < 680) return source;
      const ref = nextRef();
      notes.push({ heading: `${ref} · ${entry.title} · ${row.label}`, source });
      return ref;
    });
    return { key: row.key, label: row.label, cells };
  });
  return { entries, rows, notes };
}

export function transposedMatrixPanels(data: MatrixDropdownTableData, width: number) {
  const available = width - MATRIX_LABEL_COLUMN_WIDTH - PDF_TABLE_STYLES.table.borderWidth;
  let note = 0;
  const nextRef = () => `[${++note}]`;
  return groupEntries(entryWidths(data, available), available)
    .map(group => panelRows(data, expandGroup(group, available), nextRef));
}
