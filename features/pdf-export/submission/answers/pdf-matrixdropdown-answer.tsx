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
  return formatMatrixDropdownCell(
    cell?.question?.value,
    cell?.question?.displayValue,
  );
}

function visibleEntry(
  question: MatrixQuestion,
  row: MatrixRow,
  fields: MatrixField[],
) {
  const cells = fields.map((field) => {
    const cell = row.getCellByColumn(field);
    return cell?.question?.isVisible ? displayCell(cell) : "";
  });
  const text = (template: string) => pdfPlainText(row.getProcessedText(template)).trim();
  const fallback = text(question.getLocalizationString("rowIndexTemplateTitle"));
  const label = text(question.singleInputTitleTemplate) || fallback;
  return { key: String(row.rowIndex), ordinal: row.rowIndex, cells, fallback, label };
}

function visibleEntries(question: MatrixQuestion, fields: MatrixField[]) {
  const entries: ReturnType<typeof visibleEntry>[] = [];
  const current = question.pageIndex;
  try {
    for (let page = 0; page < Math.max(question.pageCount, 1); page++) {
      question.pageIndex = page;
      const rows = question.visibleRows.filter((row) => !row.isEmpty);
      entries.push(...rows.map((row) => visibleEntry(question, row, fields)));
    }
  } finally {
    if (question.pageIndex !== current) question.pageIndex = current;
  }
  return entries
    .filter((entry) => entry.cells.some(Boolean))
    .sort((a, b) => a.ordinal - b.ordinal);
}

function transposedTable(question: MatrixQuestion) {
  const fields: MatrixField[] = question.visibleColumns;
  const entries = visibleEntries(question, fields);
  if (!entries.length) return null;
  const ambiguous =
    new Set(entries.map((entry) => entry.label)).size !== entries.length;
  const columns = entries.map(({ key, fallback, label }) => ({
    key,
    title: ambiguous && label !== fallback ? `${fallback}: ${label}` : label,
  }));
  const rows = fields.map((field, i) => ({
    key: field.name,
    label: pdfPlainText(field.title || field.name),
    cells: Object.fromEntries(
      entries.map((entry) => [entry.key, entry.cells[i]]),
    ),
  }));
  return { columns, rows };
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
  if (isTransposedMatrix(question)) return transposedTable(question);
  const questionColumns = question.columns ?? [];
  const filledRows = (question.visibleRows ?? []).filter((row) => !row.isEmpty);

  if (filledRows.length === 0) {
    return null;
  }
  return ordinaryTable(questionColumns, filledRows);
}

function ordinaryTable(fields: MatrixField[], entries: MatrixRow[]) {
  const columns = fields.map((column) => ({
    key: column.name,
    title: pdfPlainText(column.title || column.name),
  }));

  const rows = entries.map((row) => ({
    key: row.id,
    label: pdfPlainText(row.text || row.rowName || row.id),
    cells: Object.fromEntries(
      fields.map((field) => [
        field.name,
        displayCell(row.getCellByColumn(field)),
      ]),
    ),
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

const PdfMatrixDropdownAnswer = ({
  question,
}: Readonly<MatrixDropdownAnswerProps>) => {
  const tableData = buildMatrixDropdownTableData(question);
  if (!tableData) return <UnansweredMatrix question={question} />;
  if (isTransposedMatrix(question)) {
    return (
      <PdfTransposedMatrix
        data={tableData}
        caption={pdfPlainText(question.processedTitle)}
      />
    );
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
