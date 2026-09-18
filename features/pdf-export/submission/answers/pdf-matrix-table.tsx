import { Text, View } from "@react-pdf/renderer";
import {
  MATRIX_LABEL_COLUMN_WIDTH,
  PDF_TABLE_STYLES,
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
  return {
    ...(header ? PDF_TABLE_STYLES.tableCellHeader : PDF_TABLE_STYLES.tableCell),
    ...FIXED_COLUMN,
    width,
  };
}

function StackedMatrix({ columns, rows }: PdfMatrixTableProps) {
  return (
    <View style={PDF_TABLE_STYLES.stackedContainer}>
      {rows.map((row) => {
        const answered = columns.filter((column) => row.cells[column.key]);
        const columnsToShow = answered.length > 0 ? answered : columns;
        return (
          <View key={row.key} style={PDF_TABLE_STYLES.stackedRow} wrap={false}>
            <Text style={PDF_TABLE_STYLES.stackedRowLabel}>{row.label}</Text>
            {columnsToShow.map((column) => (
              <Text key={column.key} style={PDF_TABLE_STYLES.stackedRowCell}>
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
  const dataColumnWidth = computeMatrixDataColumnWidth(columns.length);
  if (dataColumnWidth === null) {
    return <StackedMatrix columns={columns} rows={rows} />;
  }

  const headerRow = (
    <View style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}>
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
    <View style={PDF_TABLE_STYLES.tableRow} key={row.key} wrap={false}>
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
    <View style={PDF_TABLE_STYLES.table}>
      {/* Keep header with the first data row so it is never orphaned at a page break. */}
      <View wrap={false}>
        {headerRow}
        {firstRow ? renderDataRow(firstRow) : null}
      </View>
      {remainingRows.map(renderDataRow)}
    </View>
  );
};

export default PdfMatrixTable;
