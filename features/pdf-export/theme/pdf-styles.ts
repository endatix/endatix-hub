import {
  PDF_STYLES as body,
  PDF_TABLE_STYLES as table,
} from "../submission/pdf-styles";
import type { PdfBodyLayer } from "./form-theme";

export const DEFAULT_PDF_THEME: PdfBodyLayer = {};

export function resolvePdfTheme({ form }: { form?: PdfBodyLayer }) {
  return { ...DEFAULT_PDF_THEME, ...form };
}

function bodyStyles(t: PdfBodyLayer) {
  return {
    ...body,
    mutedText: { color: t.mutedText ?? body.mutedText.color },
    mutedBorder: {
      ...body.mutedBorder,
      borderColor: t.border ?? body.mutedBorder.borderColor,
      borderRadius: t.radius ?? body.mutedBorder.borderRadius,
    },
    sectionTitle: {
      ...body.sectionTitle,
      ...(t.accent && { color: t.accent }),
    },
    questionSubTitle: {
      ...body.questionSubTitle,
      color: t.mutedText ?? body.questionSubTitle.color,
    },
  };
}

function tableStyles(t: PdfBodyLayer) {
  const border = t.tableBorder ? { borderColor: t.tableBorder } : {};
  return {
    ...table,
    table: { ...table.table, ...border },
    tableCell: { ...table.tableCell, ...border },
    tableCellHeader: { ...table.tableCellHeader, ...border },
    stackedContainer: { ...table.stackedContainer, ...border },
    stackedRow: { ...table.stackedRow, ...border },
    tableHeader: {
      ...table.tableHeader,
      borderBottomColor: t.tableBorder ?? table.tableHeader.borderBottomColor,
      backgroundColor:
        t.tableHeaderBackground ?? table.tableHeader.backgroundColor,
    },
    noAnswer: { ...table.noAnswer, color: t.mutedText ?? table.noAnswer.color },
  };
}

export function createPdfStyles(t: PdfBodyLayer) {
  return {
    page: {
      ...(t.text && { color: t.text }),
      ...(t.pageBackground && { backgroundColor: t.pageBackground }),
    },
    divider: t.border ? { borderBottomColor: t.border } : {},
    text: t.text ? { color: t.text } : {},
    muted: t.mutedText ? { color: t.mutedText } : {},
    panel: {
      ...(t.tableHeaderBackground && {
        backgroundColor: t.tableHeaderBackground,
      }),
      ...(t.radius !== undefined && { borderRadius: t.radius }),
    },
    body: bodyStyles(t),
    table: tableStyles(t),
  };
}
