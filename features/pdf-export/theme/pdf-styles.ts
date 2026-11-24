import {
  PDF_STYLES as body,
  PDF_TABLE_STYLES as table,
} from "../submission/pdf-styles";
import type { PdfBodyLayer } from "./form-theme";
import { printColors } from "./print-colors";

export const DEFAULT_PDF_THEME: PdfBodyLayer = {};

export function resolvePdfTheme({ form }: { form?: PdfBodyLayer }) {
  return { ...DEFAULT_PDF_THEME, ...form };
}

function bodyStyles(t: PdfBodyLayer, headingInk: string) {
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
      color: headingInk,
    },
  };
}

function panelStyles(t: PdfBodyLayer) {
  const backgroundColor = t.tableHeaderBackground ?? (t.pageBackground && "transparent");
  return {
    ...(backgroundColor && { backgroundColor }),
    ...(t.radius !== undefined && { borderRadius: t.radius }),
  };
}

function tableStyles(t: PdfBodyLayer, backgroundColor: string, colors: ReturnType<typeof printColors>) {
  const border = t.tableBorder ? { borderColor: t.tableBorder } : {};
  return {
    ...table,
    fieldLabel: { ...table.fieldLabel, backgroundColor: colors.fieldTint, color: colors.fieldInk },
    noteHeading: { ...table.noteHeading, color: colors.headingInk, borderTopColor: t.tableBorder ?? table.table.borderColor },
    table: { ...table.table, ...border },
    tableCell: { ...table.tableCell, ...border },
    tableCellHeader: { ...table.tableCellHeader, ...border, color: colors.headerInk },
    stackedContainer: { ...table.stackedContainer, ...border },
    stackedRow: { ...table.stackedRow, ...border },
    tableHeader: {
      ...table.tableHeader,
      borderBottomColor: t.tableBorder ?? table.tableHeader.borderBottomColor,
      backgroundColor,
    },
    noAnswer: { ...table.noAnswer, color: t.mutedText ?? table.noAnswer.color },
  };
}

export function createPdfStyles(t: PdfBodyLayer) {
  const muted = t.mutedText ?? t.text;
  const panel = panelStyles(t);
  const header = t.tableHeaderBackground ?? t.accent ?? panel.backgroundColor ?? table.tableHeader.backgroundColor;
  const colors = printColors(t, header);
  return {
    page: {
      ...(t.text && { color: t.text }),
      ...(t.pageBackground && { backgroundColor: t.pageBackground }),
    },
    divider: t.border ? { borderBottomColor: t.border } : {},
    text: t.text ? { color: t.text } : {},
    muted: muted ? { color: muted } : {},
    panel,
    body: bodyStyles(t, colors.headingInk),
    table: tableStyles(t, header, colors),
  };
}
