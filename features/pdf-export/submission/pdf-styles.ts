import { StyleSheet } from "@react-pdf/renderer";

export const PDF_STYLES = StyleSheet.create({
  image: {
    objectFit: "cover",
    width: "100%",
    height: "auto",
    wrap: "false",
  },
  icon: {
    width: 24,
    height: 24,
  },
  smallIcon: {
    width: 16,
    height: 16,
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
  },
  rightAlign: {
    textAlign: "right",
    textWrap: "wrap",
    hyphenationCallback: (word: string) => [word],
  },
  justifyBetween: {
    justifyContent: "space-between",
  },
  smallText: {
    fontSize: 10,
  },
  mutedText: {
    color: "gray",
  },
  mutedBorder: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    padding: 8,
  },
  marginBottom: {
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 12,
    fontFamily: "Roboto-Bold",
    marginBottom: 2,
  },
  questionSubTitle: {
    fontFamily: "Roboto",
    fontSize: 9,
    width: "100%",
    color: "gray",
  },
  section: {
    marginBottom: 16,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Roboto-Bold",
  },
});

export const PDF_TABLE_STYLES = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  caption: {
    fontSize: 11,
    fontFamily: "Roboto-Bold",
    marginBottom: 6,
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#c0c0c0",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 20,
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#c0c0c0",
  },
  tableCell: {
    fontSize: 10,
    fontFamily: "Roboto",
    padding: 4,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#c0c0c0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    flexShrink: 1,
    flexGrow: 1,
    wordBreak: "break-word",
    minWidth: 50,
    flex: 1,
  },

  tableCellHeader: {
    fontSize: 10,
    fontFamily: "Roboto-Bold",
    textAlign: "center",
    padding: 4,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#c0c0c0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    flexShrink: 1,
    flexGrow: 1,
    wordBreak: "break-word",
    minWidth: 50,
    flex: 1,
  },
  noAnswer: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
  },
  stackedContainer: {
    marginTop: 8,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#c0c0c0",
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  stackedRow: {
    padding: 6,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#c0c0c0",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  stackedRowLabel: {
    fontSize: 10,
    fontFamily: "Roboto-Bold",
    marginBottom: 2,
  },
  stackedRowCell: {
    fontSize: 10,
    fontFamily: "Roboto",
    marginBottom: 1,
  },
});

/** A4 content width after submission-details-pdf page margins. */
export const MATRIX_TABLE_CONTENT_WIDTH = 550;
export const MATRIX_LABEL_COLUMN_WIDTH = 110;
export const MATRIX_MIN_DATA_COLUMN_WIDTH = 48;

/** Even split of remaining width, or null → stacked layout. */
export function computeMatrixDataColumnWidth(
  dataColumnCount: number,
): number | null {
  if (dataColumnCount <= 0) {
    return null;
  }

  const width =
    (MATRIX_TABLE_CONTENT_WIDTH - MATRIX_LABEL_COLUMN_WIDTH) / dataColumnCount;

  return width >= MATRIX_MIN_DATA_COLUMN_WIDTH ? width : null;
}
