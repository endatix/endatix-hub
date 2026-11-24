import { Text, View } from "@react-pdf/renderer";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import { resolveItemValueLabel } from "../format-choice-display";
import {
  PdfMatrixTable,
  type PdfMatrixTableColumn,
  type PdfMatrixTableRow,
} from "./pdf-matrix-table";

interface MatrixAnswerPdfProps {
  question: QuestionMatrixModel;
}

function selectedCells(columns: PdfMatrixTableColumn[], selected: string) {
  const mark = columns.length === 6 ? "X" : "✓";
  return Object.fromEntries(
    columns.map(({ key }) => [key, key === selected ? mark : ""]),
  );
}

export function buildMatrixAnswerTableData(
  question: QuestionMatrixModel,
): { columns: PdfMatrixTableColumn[]; rows: PdfMatrixTableRow[] } | null {
  if (!question.rows || !question.columns || !question.value) {
    return null;
  }

  const columns: PdfMatrixTableColumn[] = question.columns.map(
    (column: ItemValue) => ({
      key: String(column.value),
      title: pdfPlainText(
        resolveItemValueLabel(column) ?? String(column.value),
      ),
    }),
  );

  const rows: PdfMatrixTableRow[] = [];
  question.rows.forEach((row: ItemValue, index: number) => {
    const selected = question.value[row.value];
    if (selected === undefined || selected === null || selected === "") {
      return;
    }

    const selectedKey = String(selected);
    const rowText = row.hasText ? row.text : `Row ${index + 1}`;

    rows.push({
      key: String(row.value),
      label: pdfPlainText(rowText),
      cells: selectedCells(columns, selectedKey),
    });
  });

  return rows.length === 0 ? null : { columns, rows };
}

const PdfMatrixAnswer = ({ question }: MatrixAnswerPdfProps) => {
  const { table } = currentPdfStyles();
  const tableData = buildMatrixAnswerTableData(question);

  if (!tableData) {
    return <Text style={table.noAnswer}>No answer</Text>;
  }

  return (
    <View style={table.container}>
      <PdfMatrixTable {...tableData}>
        <Text style={table.caption}>
          Answers for the &quot;{pdfPlainText(question.title)}
          &quot; question
        </Text>
      </PdfMatrixTable>
    </View>
  );
};

export default PdfMatrixAnswer;
