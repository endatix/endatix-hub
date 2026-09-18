import { Text, View } from "@react-pdf/renderer";
import {
  MATRIX_LABEL_COLUMN_WIDTH,
  computeMatrixDataColumnWidth,
} from "@/features/pdf-export/submission/pdf-styles";
import type { PdfThemeStyles } from "@/features/pdf-export/create-pdf-theme-styles";

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
  themeStyles: PdfThemeStyles;
  cellKind?: "text" | "checkbox" | "input";
}

const FIXED_COLUMN = { flexGrow: 0, flexShrink: 0, minWidth: 0 };

function cellStyle(
  themeStyles: PdfThemeStyles,
  width: number,
  header = false,
) {
  return {
    ...(header ? themeStyles.tableCellHeader : themeStyles.tableCell),
    ...FIXED_COLUMN,
    width,
  };
}

function CellValue({
  row,
  column,
  cellKind,
  themeStyles,
}: {
  row: PdfMatrixTableRow;
  column: PdfMatrixTableColumn;
  cellKind: "text" | "checkbox" | "input";
  themeStyles: PdfThemeStyles;
}) {
  const raw = row.cells[column.key] ?? "";
  if (cellKind === "checkbox") {
    return <Text style={themeStyles.answerText}>{raw ? "☑" : "☐"}</Text>;
  }
  return <Text>{raw || (cellKind === "text" ? "" : "")}</Text>;
}

function StackedMatrix({
  columns,
  rows,
  themeStyles,
  cellKind = "text",
}: PdfMatrixTableProps) {
  return (
    <View style={themeStyles.stackedContainer}>
      {rows.map((row) => {
        const answered = columns.filter((column) => row.cells[column.key]);
        const columnsToShow = answered.length > 0 ? answered : columns;
        return (
          <View key={row.key} style={themeStyles.stackedRow}>
            <Text style={themeStyles.stackedRowLabel}>{row.label}</Text>
            {columnsToShow.map((column) => (
              <View key={column.key} style={themeStyles.stackedRowCell}>
                {cellKind === "text" ? (
                  <Text>
                    {column.title}: {row.cells[column.key] || "-"}
                  </Text>
                ) : (
                  <View>
                    <Text>{column.title}: </Text>
                    <CellValue
                      row={row}
                      column={column}
                      cellKind={cellKind}
                      themeStyles={themeStyles}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export const PdfMatrixTable = ({
  columns,
  rows,
  themeStyles,
  cellKind = "text",
}: PdfMatrixTableProps) => {
  const dataColumnWidth = computeMatrixDataColumnWidth(columns.length);
  if (dataColumnWidth === null) {
    return (
      <StackedMatrix
        columns={columns}
        rows={rows}
        themeStyles={themeStyles}
        cellKind={cellKind}
      />
    );
  }

  const headerRow = (
    <View style={[themeStyles.tableRow, themeStyles.tableHeader]}>
      <View style={cellStyle(themeStyles, MATRIX_LABEL_COLUMN_WIDTH, true)}>
        <Text> </Text>
      </View>
      {columns.map((column) => (
        <View
          key={column.key}
          style={cellStyle(themeStyles, dataColumnWidth, true)}
        >
          <Text>{column.title}</Text>
        </View>
      ))}
    </View>
  );

  const renderDataRow = (row: PdfMatrixTableRow) => (
    <View style={themeStyles.tableRow} key={row.key}>
      <View style={cellStyle(themeStyles, MATRIX_LABEL_COLUMN_WIDTH)}>
        <Text>{row.label}</Text>
      </View>
      {columns.map((column) => (
        <View
          key={column.key}
          style={cellStyle(themeStyles, dataColumnWidth)}
        >
          <CellValue
            row={row}
            column={column}
            cellKind={cellKind}
            themeStyles={themeStyles}
          />
        </View>
      ))}
    </View>
  );

  const [firstRow, ...remainingRows] = rows;

  return (
    <View style={themeStyles.table}>
      <View wrap={false}>
        {headerRow}
        {firstRow ? renderDataRow(firstRow) : null}
      </View>
      {remainingRows.map(renderDataRow)}
    </View>
  );
};

export default PdfMatrixTable;
