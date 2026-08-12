import { Text, View } from "@react-pdf/renderer";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import { PDF_TABLE_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import {
  formatChoiceDisplay,
  resolveMatrixColumnLabel,
} from "../format-choice-display";

interface MatrixAnswerPdfProps {
  question: QuestionMatrixModel;
}

interface IMatrixAnswer {
  rowKey: string;
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
    question.rows.forEach((row: ItemValue, index: number) => {
      if (!question?.value || !question?.columns) {
        return;
      }
      // Image-only rows (matrix carousel) have no authored text — fall back
      // to a positional label instead of dropping the row from the export.
      // hasText (not a truthy check on .text): ItemValue.text always falls
      // back to String(value) when no text was authored, so `row.text ||
      // fallback` would never actually reach the fallback.
      const rowText = row.hasText ? row.text : `Row ${index + 1}`;
      const answer = question.value[row.value];
      const answerText = formatChoiceDisplay(
        answer,
        resolveMatrixColumnLabel(question, answer),
      );
      if (answerText) {
        answers.push({
          // row.value (not rowText) — SurveyJS enforces uniqueness on row
          // value (uniqueProperty: "value"), but two rows can share display
          // text, which would collide as a React key.
          rowKey: String(row.value),
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
        Answers for the &quot;{htmlSanitizer.toPlainText(question.title ?? "")}
        &quot; question
      </Text>
      <View style={PDF_TABLE_STYLES.table}>
        <View
          style={[PDF_TABLE_STYLES.tableRow, PDF_TABLE_STYLES.tableHeader]}
          fixed
        >
          <Text style={PDF_TABLE_STYLES.tableCellHeader}>Question</Text>
          <Text style={PDF_TABLE_STYLES.tableCellHeader}>Answer</Text>
        </View>
        {matrixAnswers.map((answer) => (
          <View
            style={PDF_TABLE_STYLES.tableRow}
            key={answer.rowKey}
            wrap={false}
          >
            <Text style={PDF_TABLE_STYLES.tableCell}>{answer.question}</Text>
            <Text style={PDF_TABLE_STYLES.tableCell}>{answer.answer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default PdfMatrixAnswer;
