import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { Question, QuestionCustomModel } from "survey-core";
import { currentPdfStyles } from "@/features/pdf-export/theme/pdf-theme-context";
import { getPanelTitle } from "@/lib/questions";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

interface PdfQuestionLabelProps {
  question: Question;
  style?: Style;
  /** `left` when the answer runs full width below the title (file answers). */
  align?: "left" | "right";
}

function getProcessedTitle(question: Question): string {
  if (question instanceof QuestionCustomModel) {
    return (
      question.contentQuestion?.processedTitle ??
      question.contentQuestion?.title ??
      question.title
    );
  }
  return question.processedTitle ?? question.title;
}

export const PDF_LABEL_STYLES = StyleSheet.create({
  rightAlign: {
    textAlign: "right",
  },
  leftAlign: {
    textAlign: "left",
  },
});

export const PdfQuestionLabel = ({
  question,
  style,
  align = "right",
}: PdfQuestionLabelProps) => {
  const { body } = currentPdfStyles();
  const title = pdfPlainText(getProcessedTitle(question));
  const panelTitle = pdfPlainText(getPanelTitle(question));

  const alignStyle =
    align === "right" ? body.rightAlign : PDF_LABEL_STYLES.leftAlign;
  const titleStyles = [alignStyle, body.questionTitle, ...(style ? [style] : [])];
  const subTitleStyles = [alignStyle, body.questionSubTitle];

  return (
    <View>
      <Text style={titleStyles}>{title}</Text>
      {panelTitle && <Text style={subTitleStyles}>{panelTitle}</Text>}
    </View>
  );
};
