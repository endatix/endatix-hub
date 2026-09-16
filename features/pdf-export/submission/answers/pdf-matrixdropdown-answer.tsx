import { Text, View } from "@react-pdf/renderer";
import { QuestionMatrixDropdownModel } from "survey-core";
import { VIEWER_STYLES } from "../pdf-answer-viewer";
import { formatMatrixDropdownCell } from "../format-matrix-dropdown-cell";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
}

type MatrixDropdownValue = Record<string, Record<string, unknown>>;

function asMatrixValue(value: unknown): MatrixDropdownValue {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as MatrixDropdownValue;
}

const PdfMatrixDropdownAnswer = ({
  question,
}: Readonly<MatrixDropdownAnswerProps>) => {
  const value = asMatrixValue(question.value);
  const displayByRow = asMatrixValue(question.getDisplayValue(false, value));
  const columns = question.columns ?? [];
  const rows = question.visibleRows ?? question.rows ?? [];

  const filledRows = rows.filter((row) => {
    const rowValue = value[String(row.value)];
    if (!rowValue) {
      return false;
    }

    return columns.some((column) => {
      const cell = rowValue[column.name];
      return cell !== undefined && cell !== null && cell !== "";
    });
  });

  if (filledRows.length === 0) {
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
      <View style={PDF_TABLE_STYLES.table}>
        <View style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}>
          <View style={{ ...PDF_TABLE_STYLES.tableCellHeader, flex: 1 }}>
            <Text> </Text>
          </View>
          {columns.map((column) => (
            <View
              key={column.name}
              style={{ ...PDF_TABLE_STYLES.tableCellHeader, flex: 1.5 }}
            >
              <Text>{pdfPlainText(column.title || column.name)}</Text>
            </View>
          ))}
        </View>
        {filledRows.map((row) => {
          const rowKey = String(row.value);
          const rowValue = value[rowKey] ?? {};
          const rowDisplay = displayByRow[rowKey] ?? {};
          return (
            <View style={PDF_TABLE_STYLES.tableRow} key={rowKey}>
              <View style={{ ...PDF_TABLE_STYLES.tableCell, flex: 1 }}>
                <Text>{pdfPlainText(row.text || rowKey)}</Text>
              </View>
              {columns.map((column) => (
                <View
                  key={column.name}
                  style={{ ...PDF_TABLE_STYLES.tableCell, flex: 1.5 }}
                >
                  <Text>
                    {formatMatrixDropdownCell(
                      rowValue[column.name],
                      rowDisplay[column.name],
                    )}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default PdfMatrixDropdownAnswer;
