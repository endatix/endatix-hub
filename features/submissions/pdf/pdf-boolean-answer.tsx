import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { QuestionBooleanModel } from 'survey-core';
import { VIEWER_STYLES } from './pdf-answer-viewer';

interface BooleanAnswerProps {
  question: QuestionBooleanModel;
}

const styles = StyleSheet.create({
  valueContainer: {
    flexDirection: 'row',
  },
  booleanText: {
    fontFamily: 'Roboto-Bold',
    fontSize: 12,
  },
  yes: {
    color: '#006105',
  },
  no: {
    color: '#FF0000',
  },
});

const PdfBooleanAnswer = ({ question }: BooleanAnswerProps) => {
  if (question.value === null || typeof question.value === 'undefined') {
    return <Text style={VIEWER_STYLES.answerText}>No Answer</Text>;
  }

  const label = question.value
    ? question.locLabelTrue.text
    : question.locLabelFalse.text;
  const style = question.value ? styles.yes : styles.no;

  return (
    <View style={styles.valueContainer}>
      <Text style={[styles.booleanText, style]}>{label.toUpperCase()}</Text>
    </View>
  );
};

export default PdfBooleanAnswer;
