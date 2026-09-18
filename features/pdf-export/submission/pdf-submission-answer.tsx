import type { ReactNode } from "react";
import { getPanelTitle } from "@/lib/questions/question-utils";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { Question, QuestionNonValue } from "survey-core";
import { EyeOffIcon } from "./icons";
import type { PdfFormChrome } from "./pdf-form-field";
import PdfAnswerViewer from "./pdf-answer-viewer";
import { PdfQuestionLabel } from "./pdf-question-label";

interface PdfSubmissionAnswerProps {
  question: Question;
  chrome: PdfFormChrome;
  showPanelHeader?: boolean;
}

const FULL_WIDTH_TYPES = new Set([
  "matrixdropdown",
  "matrixdynamic",
  "paneldynamic",
  "matrix",
]);

export const PdfSubmissionAnswer = ({
  question,
  chrome,
  showPanelHeader = false,
}: PdfSubmissionAnswerProps) => {
  if (question instanceof QuestionNonValue) {
    return null;
  }

  const panelTitle = pdfPlainText(getPanelTitle(question));
  const rows: ReactNode[] = [];

  if (showPanelHeader && panelTitle) {
    rows.push(
      <View key={`panel-title-${panelTitle}`} style={styles.groupHeaderRow}>
        <Text style={chrome.themeStyles.groupHeaderText}>{panelTitle}</Text>
      </View>,
    );
  }

  if (FULL_WIDTH_TYPES.has(question.getType())) {
    rows.push(
      <View key={question.id} style={styles.fullWidthAnswerRow}>
        <PdfAnswerViewer
          forQuestion={question}
          hideTitle
          chrome={chrome}
        />
      </View>,
    );
    return <View>{rows}</View>;
  }

  if (!question.isVisibleInSurvey) {
    rows.push(
      <View key={question.id} style={[styles.questionRow, chrome.themeStyles.answerRow]}>
        <View style={styles.labelCol}>
          <PdfQuestionLabel
            question={question}
            themeStyles={chrome.themeStyles}
            style={styles.questionLabel}
          />
        </View>
        <View style={styles.answerCol}>
          <View style={styles.invisibleRow}>
            <EyeOffIcon />
            <Text style={chrome.themeStyles.invisibleText}>
              This question was not visible in the survey.
            </Text>
          </View>
        </View>
      </View>,
    );
    return <View>{rows}</View>;
  }

  rows.push(
    <View key={question.id} style={[styles.questionRow, chrome.themeStyles.answerRow]}>
      <View style={styles.labelCol}>
        <PdfQuestionLabel
          question={question}
          themeStyles={chrome.themeStyles}
          style={styles.questionLabel}
        />
      </View>
      <View style={styles.answerCol}>
        <PdfAnswerViewer
          forQuestion={question}
          hideTitle
          chrome={chrome}
        />
      </View>
    </View>,
  );
  return <View>{rows}</View>;
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
  questionLabel: {
    fontSize: 12,
    fontFamily: "Roboto-Bold",
    marginBottom: 2,
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
