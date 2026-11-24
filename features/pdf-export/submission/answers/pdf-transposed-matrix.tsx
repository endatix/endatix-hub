import { Text, View } from "@react-pdf/renderer";
import { currentPdfStyles } from "../../theme/pdf-theme-context";
import { MATRIX_LABEL_COLUMN_WIDTH, PDF_ANSWER_WIDTH } from "../pdf-styles";
import { MATRIX_LINE_STYLE, measureSource } from "./matrix-print-bands";
import type { MatrixDropdownTableData } from "./pdf-matrixdropdown-answer";
import { StartGridTogether } from "./pdf-matrix-table";
import {
  transposedMatrixPanels,
  type MatrixNote,
} from "./transposed-matrix-panels";

type Panel = ReturnType<typeof transposedMatrixPanels>[number];
type Line = {
  label: string;
  cells: string[];
  entries: Panel["entries"];
  heading?: boolean;
};

function fixedWidth(width: number) {
  return {flex: undefined, flexBasis: width, flexGrow: 0, flexShrink: 0, width};
}

function PanelLine({ label, cells, entries, heading }: Readonly<Line>) {
  const { table } = currentPdfStyles();
  const style = heading ? table.tableCellHeader : table.tableCell;
  const widths = [MATRIX_LABEL_COLUMN_WIDTH, ...entries.map(entry => entry.width)];
  return (
    <View
      wrap={false}
      style={heading ? [table.tableRow, table.tableHeader] : table.tableRow}
    >
      {[label, ...cells].map((value, i) => (
        <Text key={i === 0 ? "field" : entries[i - 1].key}
          style={[style, !heading && i === 0 ? table.fieldLabel : {}, MATRIX_LINE_STYLE, fixedWidth(widths[i])]}>
          {value}
        </Text>
      ))}
    </View>
  );
}

function FullWidthNote({ heading, source }: Readonly<MatrixNote>) {
  const { table } = currentPdfStyles();
  const body = measureSource(
    PDF_ANSWER_WIDTH,
    table.tableCell.fontFamily,
  )(source);
  return (
    <View>
      <StartGridTogether presence={60} />
      <View style={{ marginTop: 8 }}>
        <Text fixed style={table.noteHeading}>
          Note {heading}
        </Text>
        <Text style={table.noteText}>
          {body.text}
        </Text>
      </View>
    </View>
  );
}

function panelBands(panel: Panel) {
  const { table } = currentPdfStyles();
  return panel.bands.map((band) => (
    <View wrap={false} key={band[0].key} style={table.table}>
      <PanelLine
        label="Field"
        cells={panel.entries.map((entry) => entry.title)}
        entries={panel.entries}
        heading
      />
      {band.map(({ key, ...row }) => (
        <PanelLine key={key} {...row} entries={panel.entries} />
      ))}
    </View>
  ));
}

function PanelGrid({panel, caption, group}: {readonly panel: Panel; readonly caption: string; readonly group?: string}) {
  const { table } = currentPdfStyles();
  const [first, ...rest] = panelBands(panel);
  return (
    <>
      <View>
        <StartGridTogether />
        {group && <Text style={table.groupNumber}>{group}</Text>}
        <Text style={table.caption}>{caption}</Text>
        {first}
      </View>
      {rest}
    </>
  );
}

export function PdfTransposedMatrix({
  data,
  caption,
}: {
  readonly data: MatrixDropdownTableData;
  readonly caption: string;
}) {
  const panels = transposedMatrixPanels(data, PDF_ANSWER_WIDTH);
  return panels.map((panel, index) => (
    <View key={panel.entries[0].key}>
      <PanelGrid panel={panel} caption={caption} group={panels.length > 1 ? `Group ${index + 1} of ${panels.length}` : undefined} />
      {panel.notes.map((note) => (
        <FullWidthNote key={note.heading} {...note} />
      ))}
    </View>
  ));
}
