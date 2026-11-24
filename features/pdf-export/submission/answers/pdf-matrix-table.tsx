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

interface RowBand {
  rows: PdfMatrixTableRow[];
  flowing: boolean;
}

function cellText(row: PdfMatrixTableRow) {
  return [row.label, ...Object.values(row.cells)];
}

function needsFlow(row: PdfMatrixTableRow) {
  return cellText(row).some((cell) => cell.length > MAX_ATOMIC_TEXT_LENGTH);
}

// Small grid bands carry their own legend. The renderer places the real
// header and rows together, regardless of how much room the preceding question used.
function compactBands(rows: PdfMatrixTableRow[]) {
  const bands: RowBand[] = [];
  let compact: RowBand | undefined;
  for (const row of rows) {
    if (cellText(row).some((cell) => /[\r\n\u2028\u2029]/u.test(cell))) {
      bands.push({ rows: [row], flowing: false });
      compact = undefined;
      continue;
    }
    if (!compact || compact.rows.length === 6) {
      compact = { rows: [], flowing: false };
      bands.push(compact);
    }
    compact.rows.push(row);
  }
  return bands;
}

function rowBands(rows: PdfMatrixTableRow[]) {
  const firstLong = rows.findIndex((row) => needsFlow(row));
  if (firstLong < 0) return compactBands(rows);
  // Start the flowing tail on a fresh sheet when paginating. Only one such
  // break per matrix, even when short and page-long answers alternate.
  return [
    ...compactBands(rows.slice(0, firstLong)),
    { rows: rows.slice(firstLong), flowing: true },
  ];
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
  readonly flowing: boolean;
}

function ColumnHeaders({ headings, width, flowing }: HeaderProps) {
  const { table } = currentPdfStyles();
  return (
    <View fixed={flowing} style={[table.tableRow, table.tableHeader]}>
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
  return (
    <View style={table.tableRow} wrap={needsFlow(row)}>
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

type BandProps = Omit<HeaderProps, "flowing"> & { readonly band: RowBand };

function GridBand({ headings, width, band }: BandProps) {
  const { table } = currentPdfStyles();
  return (
    <View wrap={band.flowing} break={band.flowing} style={table.table}>
      <ColumnHeaders headings={headings} width={width} flowing={band.flowing} />
      {band.rows.map((row) => (
        <DataRow key={row.key} row={row} columns={headings} width={width} />
      ))}
    </View>
  );
}

export const PdfMatrixTable = ({ columns, rows }: PdfMatrixTableProps) => {
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
      {rowBands(rows).map((band) => (
        <GridBand
          key={band.rows[0].key}
          band={band}
          headings={headings}
          width={width}
        />
      ))}
    </View>
  );
};

export default PdfMatrixTable;
