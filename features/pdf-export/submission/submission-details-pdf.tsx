import { Submission } from "@/lib/endatix-api";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Fragment } from "react";
import { Model, PanelModelBase, type Question } from "survey-core";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";
import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { PdfBrandFooter, PdfBrandHeader } from "./pdf-brand-chrome";
import { PdfGroupHeading, PdfSubmissionAnswer } from "./pdf-submission-answer";
import { PdfSubmissionProperties } from "./pdf-submission-properties";
import { PDF_FOOTER_PADDING, PDF_PAGE_PADDING } from "./pdf-styles";
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
    ? [styles.page, page, { paddingBottom: PDF_FOOTER_PADDING }]
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

function newGroupHeadings(question: Question, seen: Set<PanelModelBase>) {
  const headings = [];
  for (
    let panel = question.parent;
    panel instanceof PanelModelBase && !seen.has(panel);
    panel = panel.parent
  ) {
    seen.add(panel);
    const title = pdfPlainText(panel.processedTitle);
    if (title)
      headings.unshift(<PdfGroupHeading key={panel.id} title={title} />);
  }
  return headings;
}

function answerRows(model: Model) {
  const seen = new Set<PanelModelBase>();
  const questions = model
    .getAllQuestions(false, false, false)
    .filter(shouldIncludeQuestionInPdf);
  return questions.map((question) => (
    <Fragment key={question.name}>
      {newGroupHeadings(question, seen)}
      <PdfSubmissionAnswer question={question} />
    </Fragment>
  ));
}

function PdfAnswers({ model }: { readonly model: Model }) {
  const { body } = currentPdfStyles();
  return (
    <View style={body.section}>
      <Text style={body.sectionTitle}>Submission Answers</Text>
      <View style={{ marginTop: 8 }}>{answerRows(model)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: PDF_PAGE_PADDING,
    fontSize: 12,
    fontFamily: "Roboto",
  },
});
