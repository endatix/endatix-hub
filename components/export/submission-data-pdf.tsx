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
import PdfAnswerViewer from "@/features/submissions/pdf/pdf-answer-viewer";
import { setupBrowserPolyfills } from "@/features/submissions/pdf/browser-polyfills";
import { Submission } from "@/types";
import { getElapsedTimeString, parseDate } from "@/lib/utils";
import EyeOffIcon from "@/features/pdf-export/components/icons/eye-off-icon";
import { PdfQuestionLabel } from "@/features/submissions/pdf/pdf-question-label";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions";

Font.register({
  family: "Roboto",
  fonts: [{ src: "./public/assets/fonts/Roboto-Regular.ttf" }],
});

Font.register({
  family: "Roboto-Bold",
  fonts: [{ src: "./public/assets/fonts/Roboto-Bold.ttf" }],
});

// TODO: This is a duplicate of function in submission-properties.tsx
const getFormattedDate = (date: Date): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return "-";
  }

  return parsedDate.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
};

interface SubmissionDataPdfProps {
  submission: Submission;
  customQuestions: CustomQuestion[];
}

export const SubmissionDataPdf = ({
  submission,
  customQuestions,
}: SubmissionDataPdfProps) => {
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

  // Dynamic variables logic
  const dynamicVariableNames = surveyModel.getVariableNames?.() ?? [];
  const hasVariables = dynamicVariableNames.length > 0;

  // TODO: This is a duplicate of a function in question-label.tsx
  const getPanelTitle = (question: Question) => {
    const panel = question.parent;
    if (panel instanceof PanelModel) {
      return panel.title;
    }
    return "";
  };

  let lastPanel: string | null = null;

  return (
    <Document>
      <Page style={styles.page}>
        <View style={[styles.section, styles.sectionProperties]}>
          <Text style={styles.sectionTitle}>Submission Properties</Text>
          <Text>ID: {submission.id}</Text>
          <Text>Completed: {submission.isComplete ? "Yes" : "No"}</Text>
          <Text>Created at: {getFormattedDate(submission.createdAt)}</Text>
          <Text>Comleted on: {getFormattedDate(submission.completedAt)}</Text>
          <Text>
            Completion time:{" "}
            {getElapsedTimeString(
              submission.createdAt,
              submission.completedAt,
              "long",
            )}
          </Text>
          <Text>
            Last modified on: {getFormattedDate(submission.modifiedAt)}
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submission Answers</Text>
          {/* Dynamic Variables Section */}
          {hasVariables && (
            <View style={styles.dynamicVariablesSection}>
              <Text style={styles.dynamicVariablesTitle}>
                Dynamic Variables
              </Text>
              {dynamicVariableNames.map((name) => (
                <View key={name} style={styles.dynamicVariableRow}>
                  <Text style={styles.dynamicVariableName}>{`@${name} =`}</Text>
                  <Text
                    style={styles.dynamicVariableValue}
                  >{` ${surveyModel.getVariable(name)}`}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.questions}>
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
  section: {
    marginBottom: 16,
    padding: 8,
  },
  sectionProperties: {
    fontSize: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Roboto-Bold",
  },
  questions: {
    marginTop: 8,
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
  dynamicVariablesSection: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  dynamicVariablesTitle: {
    fontSize: 11,
    fontFamily: "Roboto-Bold",
    marginBottom: 4,
  },
  dynamicVariableRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  dynamicVariableName: {
    fontSize: 10,
    color: "#666",
    marginRight: 2,
  },
  dynamicVariableValue: {
    fontSize: 10,
    color: "#222",
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
});
