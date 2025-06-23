import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ItemValue, QuestionMatrixModel } from 'survey-core';
import { PDF_TABLE_STYLES } from '@/features/pdf-export/components/pdf-styles';

interface MatrixAnswerPdfProps {
  question: Partial<QuestionMatrixModel>;
}

interface IMatrixAnswer {
  question: string;
  answer: string;
}

const PdfMatrixAnswer = ({ question }: MatrixAnswerPdfProps) => {
  // No useMemo: this is server-side only, so recalculation is fine and avoids React warnings.
  const matrixAnswers: IMatrixAnswer[] = (() => {
    if (!question.rows || !question.columns) {
      return [];
    }
    const answers: IMatrixAnswer[] = [];
    question.rows.forEach((row: ItemValue) => {
      if (!question?.value || !question?.columns) {
        return;
      }
      const rowText = row.text;
      const answer = question.value[row.value];
      const answerText =
        question.columns.find((c: ItemValue) => c.value === answer)?.text ?? '';
      if (answerText && rowText) {
        answers.push({
          question: rowText,
          answer: answerText,
        });
      }
    });
    return answers;
  })();

  if (!matrixAnswers || matrixAnswers.length === 0) {
    return <Text style={PDF_TABLE_STYLES.noAnswer}>No answer</Text>;
  }

  return (
    <View style={PDF_TABLE_STYLES.container}>
      <Text style={PDF_TABLE_STYLES.caption}>
        Answers for the &quot;{question.title}&quot; question
      </Text>
      <View style={PDF_TABLE_STYLES.table}>
        <View style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]} fixed>
          <Text style={PDF_TABLE_STYLES.tableCellHeader}>Question</Text>
          <Text style={PDF_TABLE_STYLES.tableCellHeader}>Answer</Text>
        </View>
        {matrixAnswers.map((answer) => (
          <View style={PDF_TABLE_STYLES.tableRow} key={answer.question} wrap={false}>
            <Text style={PDF_TABLE_STYLES.tableCell}>{answer.question}</Text>
            <Text style={PDF_TABLE_STYLES.tableCell}>{answer.answer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default PdfMatrixAnswer;
