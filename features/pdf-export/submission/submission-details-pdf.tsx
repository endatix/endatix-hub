import { Submission } from "@/lib/endatix-api";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Model } from "survey-core";
import { PDF_STYLES } from "./pdf-styles";
import { PdfSubmissionAnswer } from "./pdf-submission-answer";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { PdfSubmissionVariables } from "./pdf-submission-variables";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `${process.cwd()}/public/fonts/Roboto-Regular.ttf`,
      fontWeight: "normal",
      fontStyle: "normal",
    },
  ],
});

Font.register({
  family: "Roboto-Bold",
  fonts: [
    {
      src: `${process.cwd()}/public/fonts/Roboto-Bold.ttf`,
      fontWeight: "bold",
      fontStyle: "normal",
    },
  ],
});

interface SubmissionDetailsPdfProps {
  submission: Submission;
  surveyModel: Model;
}

export const SubmissionDetailsPdf = ({
  submission,
  surveyModel,
}: SubmissionDetailsPdfProps) => {
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
              <PdfSubmissionAnswer
                key={question.name}
                question={question}
              />
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
