import { Question, QuestionNonValue } from "survey-core";
import { PdfQuestionLabel } from "./pdf-question-label";
import PdfAnswerViewer from "./pdf-answer-viewer";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { EyeOffIcon } from "./icons";
import { getPanelTitle } from "@/lib/questions/question-utils";

interface PdfSubmissionAnswerProps {
  question: Question;
}

export const PdfSubmissionAnswer = ({ question }: PdfSubmissionAnswerProps) => {
  // Helper to check if a question should render answer full width
  const isFullWidthAnswer = (question: Question) => {
    const type = question.getType();
    return (
      type === "matrixdropdown" ||
      type === "matrixdynamic" ||
      type === "paneldynamic" ||
      type === "matrix"
    );
  };

  let lastPanel: string | null = null;
  // Skip non-value questions
  if (question instanceof QuestionNonValue) {
    return null;
  }

  const panelTitle = getPanelTitle(question);
  let showPanelTitle = false;

  if (!lastPanel) {
    lastPanel = panelTitle;
    showPanelTitle = !!panelTitle;
  } else if (lastPanel !== panelTitle) {
    showPanelTitle = !!panelTitle;
    lastPanel = panelTitle;
  }

  const rows: React.ReactNode[] = [];

  // Insert a group header row when the panel changes
  if (showPanelTitle && panelTitle) {
    rows.push(
      <View key={`panel-title-${panelTitle}`} style={styles.groupHeaderRow}>
        <Text style={styles.groupHeaderText}>{panelTitle}</Text>
      </View>,
    );
  }

  // Full width answer logic
  if (isFullWidthAnswer(question)) {
    rows.push(
      <View key={question.id} style={styles.fullWidthAnswerRow}>
        <PdfAnswerViewer forQuestion={question} hideTitle pageBreak={true} />
      </View>,
    );
    return rows;
  }

  // If not visible, render label and not-visible message in two columns
  if (!question.isVisibleInSurvey) {
    rows.push(
      <View key={question.id} style={styles.questionRow}>
        <View style={styles.labelCol}>
          <PdfQuestionLabel question={question} style={styles.questionLabel} />
        </View>
        <View style={styles.answerCol}>
          <View style={styles.invisibleRow}>
            <EyeOffIcon />
            <Text style={styles.invisibleText}>
              This question was not visible in the survey.
            </Text>
          </View>
        </View>
      </View>,
    );
    return rows;
  }

  // Otherwise, render label and answer in two columns
  rows.push(
    <View key={question.id} style={styles.questionRow} wrap={true}>
      <View style={styles.labelCol}>
        <PdfQuestionLabel question={question} style={styles.questionLabel} />
      </View>
      <View style={styles.answerCol}>
        <PdfAnswerViewer forQuestion={question} hideTitle pageBreak={true} />
      </View>
    </View>,
  );
  return rows;
};

const styles = StyleSheet.create({
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  labelCol: {
    flex: 2,
    paddingRight: 12,
    justifyContent: "flex-start",
  },
  answerCol: {
    flex: 3,
    justifyContent: "flex-start",
  },
  answerColFullWidth: {
    flex: 1,
    justifyContent: "flex-start",
  },
  questionLabel: {
    fontSize: 12,
    fontFamily: "Roboto-Bold",
    marginBottom: 2,
  },
  panelTitle: {
    fontSize: 11,
    fontFamily: "Roboto-Bold",
    marginBottom: 4,
    color: "#444",
  },
  questionInvisible: {
    flexDirection: "column",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  invisibleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  invisibleText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 4,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  groupHeaderText: {
    fontSize: 13,
    fontFamily: "Roboto-Bold",
    color: "#222",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    width: "100%",
  },
  fullWidthAnswerRow: {
    width: "100%",
    marginBottom: 12,
  },
});
