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
  section: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 6,
    fontFamily: "Roboto-Bold",
  },
});

export const PDF_TABLE_STYLES = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  caption: {
    fontSize: 14,
    fontFamily: "Roboto-Bold",
    marginBottom: 2,
  },
  groupNumber: {
    fontSize: 9,
    letterSpacing: 0.6,
    fontFamily: "Roboto-Bold",
    marginTop: 8,
    marginBottom: 2,
  },
  noteHeading: {
    fontSize: 12,
    fontFamily: "Roboto-Bold",
    borderTopWidth: 0.6,
    paddingTop: 5,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 10,
    fontFamily: "Roboto",
    lineHeight: "14pt",
  },
  fieldLabel: {
    fontFamily: "Roboto-Bold",
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 0.6,
    borderColor: "#c8c8c8",
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
    backgroundColor: "#414141",
    borderBottomWidth: 0.6,
    borderBottomColor: "#c8c8c8",
  },
  tableCell: {
    fontSize: 10,
    fontFamily: "Roboto",
    padding: 4,
    borderStyle: "solid",
    borderWidth: 0.6,
    borderColor: "#c8c8c8",
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
    textAlign: "left",
    padding: 4,
    borderStyle: "solid",
    borderWidth: 0.6,
    borderColor: "#c8c8c8",
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

export const PDF_PAGE_PADDING = 20;
export const PDF_FOOTER_PADDING = 38;
/** A4 print area inside the answers section; reserve the branded footer. */
export const PDF_ANSWER_WIDTH = Math.floor(595.28 - 2 * (PDF_PAGE_PADDING + PDF_STYLES.section.padding));
export const PDF_ANSWER_HEIGHT = Math.floor(841.89 - PDF_PAGE_PADDING - PDF_FOOTER_PADDING - 2 * PDF_STYLES.section.padding);
export const MATRIX_TABLE_CONTENT_WIDTH = 550;
export const MATRIX_LABEL_COLUMN_WIDTH = 110;
export const MATRIX_MIN_DATA_COLUMN_WIDTH = 70;

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
