import { Submission } from "@/lib/endatix-api";
import { createPdfThemeStyles } from "@/features/pdf-export/create-pdf-theme-styles";
import { DEFAULT_PDF_THEME, type PdfTheme } from "@/features/pdf-export/pdf-theme";
import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import { Model } from "survey-core";
import { PDF_STYLES } from "./pdf-styles";
import { PdfSubmissionAnswer } from "./pdf-submission-answer";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { shouldIncludeQuestionInPdf } from "../should-include-question-in-pdf";
import { getPanelTitle } from "@/lib/questions/question-utils";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

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
  pdfTheme?: PdfTheme;
  fillable?: boolean;
}

export const SubmissionDetailsPdf = ({
  submission,
  surveyModel,
  pdfTheme = DEFAULT_PDF_THEME,
  fillable = false,
}: SubmissionDetailsPdfProps) => {
  const questions = surveyModel
    .getAllQuestions(false, false, false)
    .filter(shouldIncludeQuestionInPdf);
  const themeStyles = createPdfThemeStyles(pdfTheme);
  const chrome = {
    themeStyles,
    fillable,
  };

  return (
    <Document>
      <Page size="A4" style={themeStyles.page} wrap={true}>
        <View style={themeStyles.accentBar} />
        <PdfSubmissionProperties
          submission={submission}
          themeStyles={themeStyles}
        />
        <View style={PDF_STYLES.section}>
          <Text style={themeStyles.sectionTitle}>Submission Answers</Text>
          <View style={{ marginTop: 8 }}>
            {questions?.map((question, index) => {
              const panelTitle = pdfPlainText(getPanelTitle(question));
              const previousTitle =
                index > 0
                  ? pdfPlainText(getPanelTitle(questions[index - 1]))
                  : "";
              return (
                <PdfSubmissionAnswer
                  key={question.name}
                  question={question}
                  chrome={chrome}
                  showPanelHeader={Boolean(panelTitle) && panelTitle !== previousTitle}
                />
              );
            })}
          </View>
        </View>
      </Page>
    </Document>
  );
};
