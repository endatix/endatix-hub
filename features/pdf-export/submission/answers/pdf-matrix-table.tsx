import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import { Text, View } from "@react-pdf/renderer";
import {
  MATRIX_LABEL_COLUMN_WIDTH,
  computeMatrixDataColumnWidth,
} from "@/features/pdf-export/submission/pdf-styles";

export interface PdfMatrixTableColumn {
  key: string;
  title: string;
}

export interface PdfMatrixTableRow {
  key: string;
  label: string;
  cells: Record<string, string>;
}

interface PdfMatrixTableProps {
  columns: PdfMatrixTableColumn[];
  rows: PdfMatrixTableRow[];
}

const FIXED_COLUMN = { flexGrow: 0, flexShrink: 0, minWidth: 0 };

// Short cells can stay together even if each character is on its own line.
// Longer content must be free to flow, not held in an unbreakable row or repeated header.
const MAX_ATOMIC_TEXT_LENGTH = 48;

function columnHeading(column: PdfMatrixTableColumn, index: number) {
  const title = column.title.replaceAll(/\s+/g, " ").trim();
  return title.length <= MAX_ATOMIC_TEXT_LENGTH
    ? { key: column.key, title, description: undefined }
    : {
        key: column.key,
        title: `Column ${index + 1}`,
        description: column.title,
      };
}

type Heading = ReturnType<typeof columnHeading>;

function TableStart({ headings }: { readonly headings: Heading[] }) {
  // react-pdf copies a fixed child even into a sliver at the foot of a page.
  // Reserve its top margin, header and two body lines; cancel the space once it fits.
  // At the 72pt minimum width a 10pt bold header fits at least three characters per line.
  const longest = Math.max(1, ...headings.map(({ title }) => title.length));
  const height = 48 + 14 * Math.ceil(longest / 3);
  return <View wrap={false} style={{ height, marginBottom: -height }} />;
}

function cellStyle(width: number, header = false) {
  const { table } = currentPdfStyles();
  return {
    ...(header ? table.tableCellHeader : table.tableCell),
    ...FIXED_COLUMN,
    width,
  };
}

function answeredColumns(
  columns: PdfMatrixTableColumn[],
  row: PdfMatrixTableRow,
) {
  const answered = columns.filter((column) => row.cells[column.key]);
  return answered.length > 0 ? answered : columns;
}

function StackedMatrix({ columns, rows }: PdfMatrixTableProps) {
  const { table } = currentPdfStyles();
  return (
    <View style={table.stackedContainer}>
      {rows.map((row) => {
        const columnsToShow = answeredColumns(columns, row);
        return (
          <View key={row.key} style={table.stackedRow} wrap={false}>
            <Text style={table.stackedRowLabel}>{row.label}</Text>
            {columnsToShow.map((column) => (
              <Text key={column.key} style={table.stackedRowCell}>
                {column.title}: {row.cells[column.key] || "-"}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

interface HeaderProps {
  readonly headings: Heading[];
  readonly width: number;
}

function ColumnHeaders({ headings, width }: HeaderProps) {
  const { table } = currentPdfStyles();
  return (
    <View fixed style={[table.tableRow, table.tableHeader]}>
      <View style={cellStyle(MATRIX_LABEL_COLUMN_WIDTH, true)}>
        <Text> </Text>
      </View>
      {headings.map(({ key, title }) => (
        <View key={key} style={cellStyle(width, true)}>
          <Text>{title}</Text>
        </View>
      ))}
    </View>
  );
}

interface RowProps {
  readonly row: PdfMatrixTableRow;
  readonly columns: PdfMatrixTableColumn[];
  readonly width: number;
}

function DataRow({ row, columns, width }: RowProps) {
  const { table } = currentPdfStyles();
  const wrap = [row.label, ...Object.values(row.cells)].some(
    (text) => text.length > MAX_ATOMIC_TEXT_LENGTH,
  );
  return (
    <View style={table.tableRow} wrap={wrap}>
      <View style={cellStyle(MATRIX_LABEL_COLUMN_WIDTH)}>
        <Text>{row.label}</Text>
      </View>
      {columns.map((column) => (
        <View key={column.key} style={cellStyle(width)}>
          <Text>{row.cells[column.key] ?? ""}</Text>
        </View>
      ))}
    </View>
  );
}

export const PdfMatrixTable = ({ columns, rows }: PdfMatrixTableProps) => {
  const { table } = currentPdfStyles();
  const width = computeMatrixDataColumnWidth(columns.length);
  if (width === null) return <StackedMatrix columns={columns} rows={rows} />;
  const headings = columns.map((column, index) => columnHeading(column, index));

  return (
    <View>
      {headings.map(
        ({ key, title, description }) =>
          description && (
            <Text key={key}>
              {title}: {description}
            </Text>
          ),
      )}
      <TableStart headings={headings} />
      <View style={table.table}>
        <ColumnHeaders headings={headings} width={width} />
        {rows.map((row) => (
          <DataRow key={row.key} row={row} columns={columns} width={width} />
        ))}
      </View>
    </View>
  );
};

export default PdfMatrixTable;
