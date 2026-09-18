import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { Question, QuestionCustomModel } from "survey-core";
import { PDF_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { getPanelTitle } from "@/lib/questions";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

interface PdfQuestionLabelProps {
  question: Question;
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

function toPlainText(html: string): string {
  return htmlSanitizer.toPlainText(html ?? "");
}

export const PDF_LABEL_STYLES = StyleSheet.create({
  rightAlign: {
    textAlign: "right",
  },
});

export const PdfQuestionLabel = ({
  question,
  style,
}: PdfQuestionLabelProps) => {
  const title = toPlainText(getProcessedTitle(question));
  const panelTitle = toPlainText(getPanelTitle(question) ?? "");

  const titleStyles = [
    PDF_STYLES.rightAlign,
    PDF_STYLES.questionTitle,
    ...(style ? [style] : []),
  ];
  const subTitleStyles = [PDF_STYLES.rightAlign, PDF_STYLES.questionSubTitle];

  return (
    <View>
      <Text style={titleStyles}>{title}</Text>
      {panelTitle && <Text style={subTitleStyles}>{panelTitle}</Text>}
    </View>
  );
};
