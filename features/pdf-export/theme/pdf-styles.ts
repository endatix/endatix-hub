import { PDF_STYLES as body, PDF_TABLE_STYLES as table } from "../submission/pdf-styles";
import type { PdfBodyLayer } from "./form-theme";
import { printColors } from "./print-colors";

type Colors = ReturnType<typeof printColors>;

function bodyStyles(t: PdfBodyLayer, colors: Colors) {
  return {
    ...body,
    mutedText: { color: colors.page.caption },
    mutedBorder: {
      ...body.mutedBorder,
      borderColor: t.border ?? colors.rule,
      borderRadius: t.radius ?? body.mutedBorder.borderRadius,
    },
    sectionTitle: { ...body.sectionTitle, color: colors.page.heading },
  };
}

function tableStyles(c: Colors) {
  const border = { borderColor: c.rule };
  return {
    ...table,
    caption: { ...table.caption, color: c.page.heading },
    groupNumber: { ...table.groupNumber, color: c.page.caption },
    fieldLabel: { ...table.fieldLabel, backgroundColor: c.fieldTint, color: c.fieldInk },
    noteSurface: { backgroundColor: c.noteTint },
    noteHeading: { ...table.noteHeading, color: c.noteHeading, borderTopColor: c.rule },
    noteText: { ...table.noteText, color: c.noteInk },
    table: { ...table.table, ...border },
    tableCell: { ...table.tableCell, ...border },
    tableCellHeader: { ...table.tableCellHeader, ...border, color: c.headerInk },
    stackedContainer: { ...table.stackedContainer, ...border },
    stackedRow: { ...table.stackedRow, ...border },
    tableHeader: { ...table.tableHeader, borderBottomColor: c.rule, backgroundColor: c.band },
    noAnswer: { ...table.noAnswer, color: c.page.caption },
  };
}

export function createPdfStyles(t: PdfBodyLayer, deploymentAccent?: string) {
  const colors = printColors(t, deploymentAccent);
  const text = { color: colors.page.body };
  return {
    page: { ...text, ...(t.pageBackground && { backgroundColor: t.pageBackground }) },
    text,
    muted: { color: colors.page.caption },
    divider: { borderBottomColor: t.border ?? colors.rule },
    panel: { backgroundColor: colors.panel, ...(t.radius !== undefined && { borderRadius: t.radius }) },
    properties: {
      title: { color: colors.properties.heading },
      label: { color: colors.properties.caption },
      value: { color: colors.properties.body },
    },
    body: bodyStyles(t, colors),
    table: tableStyles(colors),
  };
}
