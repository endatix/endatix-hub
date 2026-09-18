import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { Question, QuestionCustomModel } from "survey-core";
import { PDF_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import type { PdfThemeStyles } from "@/features/pdf-export/create-pdf-theme-styles";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

interface PdfQuestionLabelProps {
  question: Question;
  themeStyles: PdfThemeStyles;
  style?: Style;
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
});

export const PdfQuestionLabel = ({
  question,
  themeStyles,
  style,
}: PdfQuestionLabelProps) => {
  const title = pdfPlainText(getProcessedTitle(question));
  const titleStyles = [
    PDF_STYLES.rightAlign,
    themeStyles.questionTitle,
    ...(style ? [style] : []),
  ];

  return (
    <View>
      <Text style={titleStyles}>{title}</Text>
    </View>
  );
};
