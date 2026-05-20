import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { Question } from "survey-core";
import { VIEWER_STYLES } from "../pdf-answer-viewer";
import {
  formatChoiceDisplay,
  resolveChoiceLabel,
} from "../format-choice-display";

interface TagBoxAnswerProps {
  question: Question;
}

const styles = StyleSheet.create({
  tagsContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: "Roboto",
  },
});

const PdfTagBoxAnswer = ({ question }: TagBoxAnswerProps) => {
  if (!question?.value || question.value.length === 0) {
    return <Text style={VIEWER_STYLES.answerText}>No Answer</Text>;
  }

  return (
    <View style={styles.tagsContainer}>
      {question.value.map((value: string) => {
        const display = formatChoiceDisplay(
          value,
          resolveChoiceLabel(question, value),
        );
        return (
          <Text key={value} style={styles.tag}>
            {display}
          </Text>
        );
      })}
    </View>
  );
};

export default PdfTagBoxAnswer;
