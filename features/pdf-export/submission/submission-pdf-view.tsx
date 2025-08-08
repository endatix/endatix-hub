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
import { getElapsedTimeString, parseDate } from "@/lib/utils";
import EyeOffIcon from "@/features/pdf-export/submission/icons/eye-off-icon";
import { PdfQuestionLabel } from "@/features/pdf-export/submission/pdf-question-label";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions";
import { DynamicVariables, MetadataSchema } from "@/features/public-form/types";
import { UserRoundSearchIcon } from "@/features/pdf-export/submission/icons";
import { PDF_STYLES } from "./pdf-styles";

Font.register({
  family: "Roboto",
  fonts: [{ src: "./public/assets/fonts/Roboto-Regular.ttf" }],
});

Font.register({
  family: "Roboto-Bold",
  fonts: [{ src: "./public/assets/fonts/Roboto-Bold.ttf" }],
});

// TODO: This is a duplicate of function in submission-properties.tsx
const getFormattedDate = (date?: Date): string => {
  if (!date) {
    return "-";
  }

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

interface SubmissionPdfViewProps {
  submission: Submission;
  customQuestions: CustomQuestion[];
}

export const SubmissionViewPdf = ({
  submission,
  customQuestions,
}: SubmissionPdfViewProps) => {
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

  let metadata: DynamicVariables = {};
  try {
    const parsedMetadata = JSON.parse(submission.metadata);
    const metadataResult = MetadataSchema.safeParse(parsedMetadata);
    if (!metadataResult.success) {
      console.warn("Invalid initial variables:", metadataResult.error);
    } else {
      metadata = metadataResult.data.variables;
    }
  } catch (ex) {
    console.warn("Error while parsing submission's metadata", ex);
  }

  Object.entries(metadata).forEach(([key, value]) => {
    surveyModel.setVariable(key, value);
  });

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
      <Page style={styles.page}>
        <View style={[styles.section, styles.sectionProperties]}>
          <Text style={styles.sectionTitle}>Submission Properties</Text>
          <View style={styles.propertiesTable}>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>ID:</Text>
              <Text style={styles.propertyValue}>{submission.id}</Text>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Is Complete?</Text>
              <Text style={styles.propertyValue}>
                {submission.isComplete ? "YES" : "NO"}
              </Text>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Created at</Text>
              <Text style={styles.propertyValue}>
                {getFormattedDate(submission.createdAt)}
              </Text>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Completed at</Text>
              <Text style={styles.propertyValue}>
                {getFormattedDate(submission.completedAt)}
              </Text>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Completion time</Text>
              <Text style={styles.propertyValue}>
                {getElapsedTimeString(
                  submission.createdAt,
                  submission.completedAt,
                  "long",
                )}
              </Text>
            </View>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyLabel}>Last modified on</Text>
              <Text style={styles.propertyValue}>
                {getFormattedDate(submission.modifiedAt)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submission Answers</Text>
          {/* Dynamic Variables Section */}
          {hasVariables && (
            <View style={styles.dynamicVariablesSection}>
              <View style={PDF_STYLES.flexRow}>
                <UserRoundSearchIcon />
                <Text style={styles.dynamicVariablesTitle}>
                  Dynamic Variables
                </Text>
              </View>
              <View style={styles.dynamicVariablesList}>
                {dynamicVariableNames.map((name) => (
                  <View key={name} style={styles.dynamicVariableRow}>
                    <Text
                      style={styles.dynamicVariableName}
                    >{`@${name} =`}</Text>
                    <Text
                      style={styles.dynamicVariableValue}
                    >{` ${surveyModel.getVariable(name)}`}</Text>
                  </View>
                ))}
              </View>
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
  section: {
    marginBottom: 16,
    padding: 8,
  },
  sectionProperties: {
    fontSize: 10,
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
  dynamicVariablesList: {
    marginTop: 2,
    gap: 2,
  },
  dynamicVariableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 2,
    backgroundColor: "#fff",
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
  propertiesTable: {
    marginTop: 8,
    width: "100%",
  },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  propertyLabel: {
    flex: 2,
    textAlign: "right",
    fontFamily: "Roboto-Bold",
    color: "#666",
    fontSize: 10,
    paddingRight: 16,
  },
  propertyValue: {
    flex: 3,
    textAlign: "left",
    fontFamily: "Roboto",
    color: "#222",
    fontSize: 10,
  },
  fullWidthAnswerRow: {
    width: "100%",
    marginBottom: 12,
  },
});
