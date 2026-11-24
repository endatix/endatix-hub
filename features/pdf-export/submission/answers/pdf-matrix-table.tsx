import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import { Text, View } from "@react-pdf/renderer";
import { MATRIX_LINE_STYLE, matrixPrintBands, nativeWordBreaks } from "./matrix-print-bands";
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
  children?: React.ReactNode;
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

interface GridLineProps {
  label?: string;
  cells: PdfMatrixTableColumn[];
  width: number;
  header?: boolean;
}

function GridLine({ label = " ", cells, width, header }: GridLineProps) {
  const { table } = currentPdfStyles();
  const dataStyle = cellStyle(width, header);
  return (
    <View
      style={header ? [table.tableRow, table.tableHeader] : table.tableRow}
      wrap={false}
    >
      <View style={cellStyle(MATRIX_LABEL_COLUMN_WIDTH, header)}>
        <Text>{label}</Text>
      </View>
      {cells.map(({ key, title }) => (
        <View key={key} style={dataStyle}>
          <Text>{title}</Text>
        </View>
      ))}
    </View>
  );
}

type GridProps = PdfMatrixTableProps & { width: number };

function dataLines({ columns, rows, width }: GridProps) {
  return rows.map((row) => {
    const cells = columns.map(({ key }) => ({
      key,
      title: row.cells[key] ?? "",
    }));
    return (
      <GridLine key={row.key} label={row.label} cells={cells} width={width} />
    );
  });
}

function MatrixGrid(props: GridProps) {
  const { table } = currentPdfStyles();
  const [firstRow, ...remainingRows] = dataLines(props);
  return (
    <View style={table.table}>
      <View wrap={false}>
        <GridLine cells={props.columns} width={props.width} header />
        {firstRow}
      </View>
      {remainingRows}
    </View>
  );
}

type PrintLayout = ReturnType<typeof matrixPrintBands>;

function columnDescriptions(legend: PrintLayout["legend"]) {
  const { table } = currentPdfStyles();
  const { fontFamily, fontSize } = table.tableCell;
  return legend.map(
    (c) =>
      c.description && (
        <Text
          key={c.key}
          style={{fontFamily, fontSize}}
        >
          {c.description}
        </Text>
      ),
  );
}

function NativeParagraph({ legend, row, width }: {
  legend: PrintLayout["legend"]; row: PrintLayout["bands"][number][number]; width: number;
}) {
  const { table } = currentPdfStyles();
  const paragraph = row.paragraph!;
  const share = 100 / (legend.length + 1);
  return <View>
    <StartGridTogether />
    <View style={table.table}>
      <View fixed><GridLine label={row.label} cells={legend} width={width} header /></View>
      <Text orphans={1} widows={1} hyphenationCallback={nativeWordBreaks(width)} style={{
        fontFamily: table.tableCell.fontFamily, fontSize: table.tableCell.fontSize,
        width: `${share}%`, marginLeft: `${share * paragraph.column}%`,
        paddingHorizontal: table.tableCell.padding, borderRightWidth: table.tableCell.borderWidth,
        borderRightColor: table.tableCell.borderColor, ...MATRIX_LINE_STYLE,
      }}>{paragraph.source}</Text>
    </View>
  </View>;
}

function printBands({bands, legend}: PrintLayout, width: number) {
  const { table } = currentPdfStyles();
  return bands.map((band) => band[0].paragraph
    ? <NativeParagraph key={band[0].key} row={band[0]} legend={legend} width={width} /> : (
    <View
      key={band[0].key}
      wrap={false}
      style={[table.table, MATRIX_LINE_STYLE]}
    >
      <GridLine cells={legend} width={width} header />
      {band.map(({key, label, cells}) =>
        <GridLine key={key} label={label} cells={cells} width={width} />)}
    </View>
  ));
}

function BandedGrid({ columns, rows, width, children }: GridProps) {
  const layout = matrixPrintBands(columns, rows, width);
  const [first, ...rest] = printBands(layout, width);
  return (
    <View>
      {columnDescriptions(layout.legend)}
      <View>
        <StartGridTogether />
        {children}
        {first}
      </View>
      {rest}
    </View>
  );
}

// React-PDF clamps presence to the measured extent of the following siblings.
// Keep the caption with the first band. The first empty sibling
// gives the paginator a break opportunity even inside a nested answer.
function StartGridTogether() {
  return (
    <>
      <View />
      <View minPresenceAhead={Number.MAX_SAFE_INTEGER} />
    </>
  );
}

export const PdfMatrixTable = (props: PdfMatrixTableProps) => {
  const width = computeMatrixDataColumnWidth(props.columns.length);
  if (width !== null && props.columns.length === 6)
    return <BandedGrid {...props} width={width} />;
  const grid = width === null ? <StackedMatrix {...props} /> : <MatrixGrid {...props} width={width} />;
  return <>{props.children}{grid}</>;
};

export default PdfMatrixTable;
