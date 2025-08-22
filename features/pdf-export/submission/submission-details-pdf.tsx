import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Model } from "survey-core";
import { setupBrowserPolyfills } from "@/features/pdf-export/submission/browser-polyfills";
import { Submission } from "@/lib/endatix-api";
import { CustomQuestion } from "@/services/api";
import { initializeCustomQuestions } from "@/lib/questions";
import { PdfSubmissionVariables } from "./pdf-submission-variables";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { PDF_STYLES } from "./pdf-styles";
import { PdfSubmissionAnswer } from "./pdf-submission-answer";
import { isLocaleValid } from "@/features/submissions/submission-localization";
import { registerAudioQuestionModel } from '@/lib/questions/audio-recorder/audio-question-pdf';

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
  locale?: string;
}

export const SubmissionDetailsPdf = ({
  submission,
  customQuestions,
  locale,
}: SubmissionDetailsPdfProps) => {
  if (!submission.formDefinition) {
    return <Text>Form definition not found</Text>;
  }

  registerAudioQuestionModel();
  setupBrowserPolyfills();

  initializeCustomQuestions(
    customQuestions.map((q: CustomQuestion) => q.jsonData),
  );

  const json = JSON.parse(submission.formDefinition.jsonData);
  const surveyModel = new Model(json);
  if (isLocaleValid(locale, surveyModel)) {
    surveyModel.locale = locale!;
  }

  let submissionData = {};
  try {
    submissionData = JSON.parse(submission?.jsonData);
  } catch (ex) {
    console.warn("Error while parsing submission's JSON data", ex);
  }

  surveyModel.data = submissionData;

  const questions = surveyModel.getAllQuestions(false, false, false);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={true}>
        <PdfSubmissionProperties submission={submission} />
        <View style={PDF_STYLES.section}>
          <Text style={PDF_STYLES.sectionTitle}>Submission Answers</Text>
          <PdfSubmissionVariables
            surveyModel={surveyModel}
            stringifiedMetadata={submission.metadata}
          />
          <View style={{ marginTop: 8 }}>
            {questions?.map((question) => (
              <PdfSubmissionAnswer key={question.name} question={question} />
            ))}
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
});
