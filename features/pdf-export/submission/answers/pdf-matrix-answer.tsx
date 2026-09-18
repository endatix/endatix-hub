import { Text, View } from "@react-pdf/renderer";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import type { PdfFormChrome } from "../pdf-form-field";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import { resolveItemValueLabel } from "../format-choice-display";
import {
  PdfMatrixTable,
  type PdfMatrixTableColumn,
  type PdfMatrixTableRow,
} from "./pdf-matrix-table";

interface MatrixAnswerPdfProps {
  question: QuestionMatrixModel;
  chrome: PdfFormChrome;
}

export function buildMatrixAnswerTableData(
  question: QuestionMatrixModel,
): { columns: PdfMatrixTableColumn[]; rows: PdfMatrixTableRow[] } | null {
  if (!question.rows || !question.columns) {
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
    const selected = question.value?.[row.value];
    const selectedKey =
      selected === undefined || selected === null || selected === ""
        ? ""
        : String(selected);
    const rowText = row.hasText ? row.text : `Row ${index + 1}`;
    const cells: Record<string, string> = {};
    columns.forEach((column) => {
      cells[column.key] = column.key === selectedKey ? "1" : "";
    });

    rows.push({
      key: String(row.value),
      label: pdfPlainText(rowText),
      cells,
    });
  });

  return rows.length === 0 ? null : { columns, rows };
}

const PdfMatrixAnswer = ({ question, chrome }: MatrixAnswerPdfProps) => {
  const tableData = buildMatrixAnswerTableData(question);

  if (!tableData) {
    return <Text style={chrome.themeStyles.noAnswer}>No answer</Text>;
  }

  return (
    <View style={PDF_TABLE_STYLES.container}>
      <Text style={chrome.themeStyles.tableCaption}>
        Answers for the &quot;{pdfPlainText(question.title)}
        &quot; question
      </Text>
      <PdfMatrixTable
        columns={tableData.columns}
        rows={tableData.rows}
        themeStyles={chrome.themeStyles}
        cellKind="checkbox"
      />
    </View>
  );
};

export default PdfMatrixAnswer;
