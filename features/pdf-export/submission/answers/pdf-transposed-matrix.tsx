import { Text, View } from "@react-pdf/renderer";
import { currentPdfStyles } from "../../theme/pdf-theme-context";
import { MATRIX_LABEL_COLUMN_WIDTH } from "../pdf-styles";
import { PDF_ANSWER_WIDTH } from "../pdf-styles";
import { MATRIX_LINE_STYLE, nativeWordBreaks } from "./matrix-print-bands";
import type { MatrixDropdownTableData } from "./pdf-matrixdropdown-answer";
import { StartGridTogether } from "./pdf-matrix-table";
import { transposedMatrixPanels, type MatrixNote } from "./transposed-matrix-panels";

type Panel = ReturnType<typeof transposedMatrixPanels>[number];
type Line = { label: string; cells: string[]; entries: Panel["entries"]; heading?: boolean };

function PanelLine({ label, cells, entries, heading }: Readonly<Line>) {
  const { table } = currentPdfStyles();
  const style = heading ? table.tableCellHeader : table.tableCell;
  const widths = [MATRIX_LABEL_COLUMN_WIDTH, ...entries.map(entry => entry.width)];
  return <View wrap={false} style={heading ? [table.tableRow, table.tableHeader] : table.tableRow}>
    {[label, ...cells].map((value, i) => <Text key={i === 0 ? "field" : entries[i - 1].key}
      hyphenationCallback={nativeWordBreaks(widths[i])}
      style={[style, MATRIX_LINE_STYLE, { flex: undefined, flexBasis: widths[i], flexGrow: 0, flexShrink: 0, width: widths[i] }]}>
      {value}
    </Text>)}
  </View>;
}

function FullWidthNote({ heading, source }: Readonly<MatrixNote>) {
  const { table } = currentPdfStyles();
  return <View>
    <StartGridTogether />
    <View style={{ marginTop: 8 }}>
      <Text fixed style={table.caption}>{heading}</Text>
      <Text style={[table.stackedRowCell, MATRIX_LINE_STYLE]} hyphenationCallback={nativeWordBreaks(PDF_ANSWER_WIDTH)}>
        {source}
      </Text>
    </View>
  </View>;
}

function PanelGrid({ panel, caption }: { readonly panel: Panel; readonly caption: string }) {
  const { table } = currentPdfStyles();
  return <View>
    <StartGridTogether />
    <View style={table.table}>
      <View fixed>
        <Text style={table.caption}>{caption}</Text>
        <PanelLine label="" cells={panel.entries.map(entry => entry.title)} entries={panel.entries} heading />
      </View>
      {panel.rows.map(({key, ...row}) => <PanelLine key={key} {...row} entries={panel.entries} />)}
    </View>
  </View>;
}

export function PdfTransposedMatrix({ data, caption }: { readonly data: MatrixDropdownTableData; readonly caption: string }) {
  const panels = transposedMatrixPanels(data, PDF_ANSWER_WIDTH);
  return panels.map(panel => <View key={panel.entries[0].key}>
    <PanelGrid panel={panel} caption={caption} />
    {panel.notes.map(note => <FullWidthNote key={note.heading} {...note} />)}
  </View>);
}
