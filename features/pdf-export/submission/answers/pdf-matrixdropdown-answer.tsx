import { Text, View } from "@react-pdf/renderer";
import { QuestionMatrixDropdownModel } from "survey-core";
import PdfAnswerViewer, { VIEWER_STYLES } from "../pdf-answer-viewer";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
}

const PdfMatrixDropdownAnswer = ({ question }: MatrixDropdownAnswerProps) => {
  const headerCells = question.renderedTable.headerRow?.cells ?? [];
  const renderedRows = question.renderedTable.renderedRows.filter(
    (row) => !row.isErrorsRow,
  );
  const hasAnswers = renderedRows.some((row) =>
    row.cells?.some((cell) => cell.question?.value),
  );

  if (!hasAnswers) {
    return (
      <View style={VIEWER_STYLES.answerContainer}>
        <Text style={VIEWER_STYLES.questionLabel}>{question.title}:</Text>
        <Text style={VIEWER_STYLES.answerText}>No Answer</Text>
      </View>
    );
  }

  return (
    <View style={PDF_TABLE_STYLES.container} break>
      <Text style={VIEWER_STYLES.questionLabel}>{question.title}</Text>
      <View style={PDF_TABLE_STYLES.table}>
        {/* Header Row */}
        <View
          style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}
          fixed
        >
          {headerCells.map((cell, index) => (
            <Text
              key={index}
              style={{
                ...PDF_TABLE_STYLES.tableCellHeader,
                flex: index === 0 ? 1 : 1.5,
              }}
            >
              {cell.hasTitle ? cell.locTitle?.textOrHtml : ""}
            </Text>
          ))}
        </View>
        {/* Data Rows */}
        {renderedRows.map((row, rowIndex) => (
          <View style={PDF_TABLE_STYLES.tableRow} key={rowIndex} wrap={false}>
            {row.cells.map((cell, cellIndex) => {
              const cellStyle = {
                ...PDF_TABLE_STYLES.tableCell,
                flex: cellIndex === 0 ? 1 : 1.5,
              };
              if (cell.hasQuestion) {
                return (
                  <View key={cellIndex} style={cellStyle}>
                    <PdfAnswerViewer forQuestion={cell.question} hideTitle />
                  </View>
                );
              }
              return (
                <Text key={cellIndex} style={cellStyle}>
                  {cell.hasTitle ? cell.locTitle.textOrHtml : ""}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

export default PdfMatrixDropdownAnswer;
