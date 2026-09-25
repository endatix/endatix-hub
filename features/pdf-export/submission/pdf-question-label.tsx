import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { Question, QuestionCustomModel } from "survey-core";
import { PDF_STYLES } from "@/features/pdf-export/submission/pdf-styles";
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
  const title = pdfPlainText(getProcessedTitle(question));
  const panelTitle = pdfPlainText(getPanelTitle(question));

  const alignStyle =
    align === "right" ? PDF_STYLES.rightAlign : PDF_LABEL_STYLES.leftAlign;
  const titleStyles = [
    alignStyle,
    PDF_STYLES.questionTitle,
    ...(style ? [style] : []),
  ];
  const subTitleStyles = [alignStyle, PDF_STYLES.questionSubTitle];

  return (
    <View>
      <Text style={titleStyles}>{title}</Text>
      {panelTitle && <Text style={subTitleStyles}>{panelTitle}</Text>}
    </View>
  );
};
