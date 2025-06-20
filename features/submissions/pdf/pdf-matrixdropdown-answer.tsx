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
  tableCol: {
    flex: 1,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4,
  },
  firstCol: {
    flex: 1.5,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4,
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
  const hasAnswers = question.visibleRows?.some((row) =>
    row.cells?.some((cell) => cell.question.value)
  );

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
        <View style={[styles.tableRow, styles.tableHeader]} fixed>
          <View style={styles.firstCol}>
            <Text style={styles.tableCellHeader}></Text>
          </View>
          {question.visibleRows.map((row) => (
            <View style={styles.tableCol} key={row.id}>
              <Text style={styles.tableCellHeader}>{row.text}</Text>
            </View>
          ))}
        </View>
        {question.columns.map((column, columnIndex) => (
          <View style={styles.tableRow} key={column.name} wrap={false}>
            <View style={styles.firstCol}>
              <Text style={styles.tableCell}>{column.title}</Text>
            </View>
            {question.visibleRows.map((row) => {
              const cellQuestion = row.cells[columnIndex]?.question;
              return (
                <View style={styles.tableCol} key={row.id}>
                  {cellQuestion ? (
                    <PdfAnswerViewer forQuestion={cellQuestion} hideTitle />
                  ) : (
                    <Text style={styles.tableCell}>N/A</Text>
                  )}
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
