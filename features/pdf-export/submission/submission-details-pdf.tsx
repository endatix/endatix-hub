import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Model, PanelModel, Question, QuestionNonValue } from "survey-core";
import PdfAnswerViewer from "@/features/pdf-export/submission/pdf-answer-viewer";
import { setupBrowserPolyfills } from "@/features/pdf-export/submission/browser-polyfills";
import { Submission } from "@/lib/endatix-api";
import EyeOffIcon from "@/features/pdf-export/submission/icons/eye-off-icon";
import { PdfQuestionLabel } from "@/features/pdf-export/submission/pdf-question-label";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions";
import { PdfSubmissionVariables } from "./pdf-submission-variables";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { PDF_STYLES } from "./pdf-styles";

Font.register({
  family: "Roboto",
  fonts: [{ src: "./public/assets/fonts/Roboto-Regular.ttf" }],
});

Font.register({
  family: "Roboto-Bold",
  fonts: [{ src: "./public/assets/fonts/Roboto-Bold.ttf" }],
});

interface SubmissionDetailsPdfProps {
  submission: Submission;
  customQuestions: CustomQuestion[];
}

export const SubmissionDetailsPdf = ({
  submission,
  customQuestions,
}: SubmissionDetailsPdfProps) => {
  if (!submission.formDefinition) {
    return <Text>Form definition not found</Text>;
  }

  setupBrowserPolyfills();

  initializeCustomQuestions(
    customQuestions.map((q: CustomQuestion) => q.jsonData),
  );

  const json = JSON.parse(submission.formDefinition.jsonData);
  const surveyModel = new Model(json);

  let submissionData = {};
  try {
    submissionData = JSON.parse(submission?.jsonData);
  } catch (ex) {
    console.warn("Error while parsing submission's JSON data", ex);
  }

  surveyModel.data = submissionData;

  const questions = surveyModel.getAllQuestions(false, false, false);

  // TODO: This is a duplicate of a function in question-label.tsx
  const getPanelTitle = (question: Question) => {
    const panel = question.parent;
    if (panel instanceof PanelModel) {
      return panel.title;
    }
    return "";
  };

  // Helper to check if a question should render answer full width
  const isFullWidthAnswer = (question: Question) => {
    const type = question.getType();
    return (
      type === "matrixdropdown" ||
      type === "matrixdynamic" ||
      type === "paneldynamic"
    );
  };

  let lastPanel: string | null = null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfSubmissionProperties submission={submission} />
        <View style={PDF_STYLES.section}>
          <Text style={PDF_STYLES.sectionTitle}>Submission Answers</Text>
          <PdfSubmissionVariables
            surveyModel={surveyModel}
            stringifiedMetadata={submission.metadata}
          />
          <View style={{ marginTop: 8 }}>
            {questions?.map((question) => {
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
                  <View
                    key={`panel-title-${panelTitle}`}
                    style={styles.groupHeaderRow}
                  >
                    <Text style={styles.groupHeaderText}>{panelTitle}</Text>
                  </View>,
                );
              }

              // Full width answer logic
              if (isFullWidthAnswer(question)) {
                rows.push(
                  <View key={question.id} style={styles.questionRow}>
                    <View style={styles.labelCol}>
                      <PdfQuestionLabel
                        question={question}
                        style={styles.questionLabel}
                      />
                    </View>
                    <View style={styles.answerCol}>
                      <PdfAnswerViewer forQuestion={question} hideTitle />
                    </View>
                  </View>,
                );
                return rows;
              }

              // If not visible, render label and not-visible message in two columns
              if (!question.isVisibleInSurvey) {
                rows.push(
                  <View key={question.id} style={styles.questionRow}>
                    <View style={styles.labelCol}>
                      <PdfQuestionLabel
                        question={question}
                        style={styles.questionLabel}
                      />
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
                <View key={question.id} style={styles.questionRow}>
                  <View style={styles.labelCol}>
                    <PdfQuestionLabel
                      question={question}
                      style={styles.questionLabel}
                    />
                  </View>
                  <View style={styles.answerCol}>
                    <PdfAnswerViewer forQuestion={question} hideTitle />
                  </View>
                </View>,
              );
              return rows;
            })}
          </View>
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 12,
    fontFamily: "Roboto",
  },
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
