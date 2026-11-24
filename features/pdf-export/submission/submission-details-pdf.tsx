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
import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { PdfBrandFooter, PdfBrandHeader } from "./pdf-brand-chrome";
import { PdfSubmissionAnswer } from "./pdf-submission-answer";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { shouldIncludeQuestionInPdf } from "../should-include-question-in-pdf";

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
  identity?: PdfBrandIdentity;
}

export const SubmissionDetailsPdf = ({
  submission,
  surveyModel,
  identity,
}: SubmissionDetailsPdfProps) => {
  const { page } = currentPdfStyles();
  const pageStyles = identity
    ? [styles.page, page, { paddingBottom: 38 }]
    : [styles.page, page];
  return (
    <Document>
      <Page size="A4" style={pageStyles} wrap={true}>
        {identity && <PdfBrandHeader identity={identity} />}
        <PdfSubmissionProperties submission={submission} />
        <PdfAnswers model={surveyModel} />
        {identity && <PdfBrandFooter identity={identity} />}
      </Page>
    </Document>
  );
};

function PdfAnswers({ model }: { readonly model: Model }) {
  const { body } = currentPdfStyles();
  const questions = model
    .getAllQuestions(false, false, false)
    .filter(shouldIncludeQuestionInPdf);
  return (
    <View style={body.section}>
      <Text style={body.sectionTitle}>Submission Answers</Text>
      <View style={{ marginTop: 8 }}>
        {questions.map((question) => (
          <PdfSubmissionAnswer key={question.name} question={question} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 12,
    fontFamily: "Roboto",
  },
});
