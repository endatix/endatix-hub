import { Text, View } from "@react-pdf/renderer";
import type { QuestionMatrixDropdownModelBase as MatrixQuestion } from "survey-core";
import { VIEWER_STYLES } from "../pdf-answer-viewer";
import { formatMatrixDropdownCell } from "../format-matrix-dropdown-cell";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import { PdfTransposedMatrix } from "./pdf-transposed-matrix";
import {
  PdfMatrixTable,
  type PdfMatrixTableColumn,
  type PdfMatrixTableRow,
} from "./pdf-matrix-table";

interface MatrixDropdownAnswerProps {
  question: MatrixQuestion;
}

export interface MatrixDropdownTableData {
  columns: PdfMatrixTableColumn[];
  rows: PdfMatrixTableRow[];
}

type MatrixRow = MatrixQuestion["visibleRows"][number];
type MatrixField = MatrixQuestion["columns"][number];

function displayCell(cell: ReturnType<MatrixRow["getCellByColumn"]>) {
  return formatMatrixDropdownCell(cell?.question?.value, cell?.question?.displayValue);
}

function entryColumns(question: MatrixQuestion, entries: MatrixRow[]) {
  const ordinal = question.getLocalizationString("rowIndexTemplateTitle");
  const labels = entries.map(row => pdfPlainText(row.getProcessedText(question.singleInputTitleTemplate)));
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return entries.map((row, i) => {
    const fallback = row.getProcessedText(ordinal);
    const label = labels[i];
    const title = (counts.get(label)! > 1 && label) ? `${fallback}: ${label}` : label || fallback;
    return { key: row.id, title };
  });
}

function fieldRow(field: MatrixField, entries: MatrixRow[]) {
  const cells = entries.map(row => {
    const cell = row.getCellByColumn(field);
    return [row.id, cell?.question?.isVisible ? displayCell(cell) : ""];
  });
  return { key: field.name, label: pdfPlainText(field.title || field.name), cells: Object.fromEntries(cells) };
}

function isTransposedMatrix(question: MatrixQuestion) {
  return question.getType() === "matrixdynamic" && question.transposeData;
}

/**
 * Row.value is the row's answer object, not an id — never index question.value
 * with it. Use row.isEmpty / getCellByColumn so matrixdropdown (row-keyed) and
 * matrixdynamic (array-keyed) share one path.
 */
export function buildMatrixDropdownTableData(
  question: MatrixQuestion,
): MatrixDropdownTableData | null {
  const questionColumns = question.columns ?? [];
  const filledRows = (question.visibleRows ?? []).filter((row) => !row.isEmpty);

  if (filledRows.length === 0) {
    return null;
  }
  if (isTransposedMatrix(question)) {
    return {
      columns: entryColumns(question, filledRows),
      rows: question.visibleColumns.map(field => fieldRow(field, filledRows)),
    };
  }
  return ordinaryTable(questionColumns, filledRows);
}

function ordinaryTable(fields: MatrixField[], entries: MatrixRow[]) {
  const columns = fields.map((column) => ({
    key: column.name,
    title: pdfPlainText(column.title || column.name),
  }));

  const rows = entries.map(row => ({
    key: row.id,
    label: pdfPlainText(row.text || row.rowName || row.id),
    cells: Object.fromEntries(fields.map(field =>
      [field.name, displayCell(row.getCellByColumn(field))])),
  }));
  return { columns, rows };
}

function UnansweredMatrix({ question }: Readonly<MatrixDropdownAnswerProps>) {
    return (
      <View style={VIEWER_STYLES.answerContainer}>
        <Text style={VIEWER_STYLES.questionLabel}>
          {pdfPlainText(question.title)}:
        </Text>
        <Text style={VIEWER_STYLES.answerText}>No Answer</Text>
      </View>
    );
}

const PdfMatrixDropdownAnswer = ({ question }: Readonly<MatrixDropdownAnswerProps>) => {
  const tableData = buildMatrixDropdownTableData(question);
  if (!tableData) return <UnansweredMatrix question={question} />;
  if (isTransposedMatrix(question)) {
    return <PdfTransposedMatrix data={tableData} caption={pdfPlainText(question.processedTitle)} />;
  }
  return (
    <View style={PDF_TABLE_STYLES.container}>
      <PdfMatrixTable {...tableData}>
        <Text style={VIEWER_STYLES.questionLabel}>
          {pdfPlainText(question.title)}
        </Text>
      </PdfMatrixTable>
    </View>
  );
};

export default PdfMatrixDropdownAnswer;
