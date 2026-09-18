import { Text, View } from "@react-pdf/renderer";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { resolveItemValueLabel } from "../format-choice-display";
import {
  PdfMatrixTable,
  type PdfMatrixTableColumn,
  type PdfMatrixTableRow,
} from "./pdf-matrix-table";

interface MatrixAnswerPdfProps {
  question: QuestionMatrixModel;
}

const SELECTED_MARK = "✓";

export function buildMatrixAnswerTableData(
  question: QuestionMatrixModel,
): { columns: PdfMatrixTableColumn[]; rows: PdfMatrixTableRow[] } | null {
  if (!question.rows || !question.columns || !question.value) {
    return null;
  }

  const columns: PdfMatrixTableColumn[] = question.columns.map(
    (column: ItemValue) => ({
      key: String(column.value),
      title: htmlSanitizer.toPlainText(
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
    const cells: Record<string, string> = {};
    columns.forEach((column) => {
      cells[column.key] = column.key === selectedKey ? SELECTED_MARK : "";
    });

    rows.push({
      key: String(row.value),
      label: htmlSanitizer.toPlainText(rowText),
      cells,
    });
  });

  return rows.length === 0 ? null : { columns, rows };
}

const PdfMatrixAnswer = ({ question }: MatrixAnswerPdfProps) => {
  const tableData = buildMatrixAnswerTableData(question);

  if (!tableData) {
    return <Text style={PDF_TABLE_STYLES.noAnswer}>No answer</Text>;
  }

  return (
    <View style={PDF_TABLE_STYLES.container}>
      <Text style={PDF_TABLE_STYLES.caption}>
        Answers for the &quot;{htmlSanitizer.toPlainText(question.title ?? "")}
        &quot; question
      </Text>
      <PdfMatrixTable columns={tableData.columns} rows={tableData.rows} />
    </View>
  );
};

export default PdfMatrixAnswer;
