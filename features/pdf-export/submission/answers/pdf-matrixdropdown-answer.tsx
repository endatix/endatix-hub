import { Text, View } from "@react-pdf/renderer";
import { QuestionMatrixDropdownModel } from "survey-core";
import { VIEWER_STYLES } from "../pdf-answer-viewer";
import { formatMatrixDropdownCell } from "../format-matrix-dropdown-cell";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import {
  PdfMatrixTable,
  type PdfMatrixTableColumn,
  type PdfMatrixTableRow,
} from "./pdf-matrix-table";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
}

export interface MatrixDropdownTableData {
  columns: PdfMatrixTableColumn[];
  rows: PdfMatrixTableRow[];
}

/**
 * Row.value is the row's answer object, not an id — never index question.value
 * with it. Use row.isEmpty / getCellByColumn so matrixdropdown (row-keyed) and
 * matrixdynamic (array-keyed) share one path.
 */
export function buildMatrixDropdownTableData(
  question: QuestionMatrixDropdownModel,
): MatrixDropdownTableData | null {
  const questionColumns = question.columns ?? [];
  const filledRows = (question.visibleRows ?? []).filter((row) => !row.isEmpty);

  if (filledRows.length === 0) {
    return null;
  }

  const columns: PdfMatrixTableColumn[] = questionColumns.map((column) => ({
    key: column.name,
    title: pdfPlainText(column.title || column.name),
  }));

  const rows: PdfMatrixTableRow[] = filledRows.map((row) => {
    const cells: Record<string, string> = {};
    questionColumns.forEach((column) => {
      const cell = row.getCellByColumn(column);
      cells[column.name] = formatMatrixDropdownCell(
        cell?.question?.value,
        cell?.question?.displayValue,
      );
    });

    return {
      key: row.id,
      label: pdfPlainText(row.text || row.rowName || row.id),
      cells,
    };
  });

  return { columns, rows };
}

const PdfMatrixDropdownAnswer = ({
  question,
}: Readonly<MatrixDropdownAnswerProps>) => {
  const tableData = buildMatrixDropdownTableData(question);

  if (!tableData) {
    return (
      <View style={VIEWER_STYLES.answerContainer}>
        <Text style={VIEWER_STYLES.questionLabel}>
          {pdfPlainText(question.title)}:
        </Text>
        <Text style={VIEWER_STYLES.answerText}>No Answer</Text>
      </View>
    );
  }

  return (
    <View style={PDF_TABLE_STYLES.container}>
      <Text style={VIEWER_STYLES.questionLabel}>
        {pdfPlainText(question.title)}
      </Text>
      <PdfMatrixTable columns={tableData.columns} rows={tableData.rows} />
    </View>
  );
};

export default PdfMatrixDropdownAnswer;
