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

export const PdfMatrixTable = ({ columns, rows }: PdfMatrixTableProps) => {
  const { table } = currentPdfStyles();
  const dataColumnWidth = computeMatrixDataColumnWidth(columns.length);
  if (dataColumnWidth === null)
    return <StackedMatrix columns={columns} rows={rows} />;

  const headerRow = (
    <View style={[table.tableRow, table.tableHeader]}>
      <View style={cellStyle(MATRIX_LABEL_COLUMN_WIDTH, true)}>
        <Text> </Text>
      </View>
      {columns.map((column) => (
        <View key={column.key} style={cellStyle(dataColumnWidth, true)}>
          <Text>{column.title}</Text>
        </View>
      ))}
    </View>
  );

  const renderDataRow = (row: PdfMatrixTableRow) => (
    <View style={table.tableRow} key={row.key} wrap={false}>
      <View style={cellStyle(MATRIX_LABEL_COLUMN_WIDTH)}>
        <Text>{row.label}</Text>
      </View>
      {columns.map((column) => (
        <View key={column.key} style={cellStyle(dataColumnWidth)}>
          <Text>{row.cells[column.key] ?? ""}</Text>
        </View>
      ))}
    </View>
  );

  const [firstRow, ...remainingRows] = rows;

  return (
    <View style={table.table}>
      {/* Keep header with the first data row so it is never orphaned at a page break. */}
      <View wrap={false}>
        {headerRow}
        {firstRow ? renderDataRow(firstRow) : null}
      </View>
      {remainingRows.map((row) => renderDataRow(row))}
    </View>
  );
};

export default PdfMatrixTable;
