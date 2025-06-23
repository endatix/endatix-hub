import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { QuestionMatrixDropdownModel } from 'survey-core';
import PdfAnswerViewer, { PDF_STYLES } from './pdf-answer-viewer';

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#c0c0c0',
  },
  firstCol: {
    flex: 1,
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  col: {
    flex: 1.5,
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    fontSize: 10,
    fontFamily: 'Roboto',
  },
  tableCellHeader: {
    fontSize: 10,
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
  },
});

const PdfMatrixDropdownAnswer = ({ question }: MatrixDropdownAnswerProps) => {
  const headerCells = question.renderedTable.headerRow?.cells ?? [];
  const renderedRows = question.renderedTable.renderedRows.filter(row => !row.isErrorsRow);
  const hasAnswers = renderedRows.some(row => row.cells?.some(cell => cell.question?.value));

  if (!hasAnswers) {
    return (
      <View style={PDF_STYLES.nonFileAnswerContainer}>
        <Text style={PDF_STYLES.questionLabel}>{question.title}:</Text>
        <Text style={PDF_STYLES.answerText}>No Answer</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} break>
      <Text style={PDF_STYLES.questionLabel}>{question.title}</Text>
      <View style={styles.table}>
        {/* Header Row */}
        <View style={[styles.tableRow, styles.tableHeader]} fixed>
          {headerCells.map((cell, index) => (
            <View
              key={index}
              style={index === 0 ? styles.firstCol : styles.col}
            >
              <Text style={styles.tableCellHeader}>
                {cell.hasTitle ? cell.locTitle?.textOrHtml : ''}
              </Text>
            </View>
          ))}
        </View>
        {/* Data Rows */}
        {renderedRows.map((row, rowIndex) => (
          <View style={styles.tableRow} key={rowIndex} wrap={false}>
            {row.cells.map((cell, cellIndex) => {
              const cellStyle = cellIndex === 0 ? styles.firstCol : styles.col;
              if (cell.hasQuestion) {
                return (
                  <View key={cellIndex} style={cellStyle}>
                    <PdfAnswerViewer forQuestion={cell.question} hideTitle />
                  </View>
                );
              }
              return (
                <View key={cellIndex} style={cellStyle}>
                  <Text style={styles.tableCell}>
                    {cell.hasTitle ? cell.locTitle.textOrHtml : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

export default PdfMatrixDropdownAnswer;
