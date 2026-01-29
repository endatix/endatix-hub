import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import { Question, QuestionCustomModel } from "survey-core";
import { PDF_STYLES } from "@/features/pdf-export/submission/pdf-styles";
import { getPanelTitle } from "@/lib/questions";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

interface PdfQuestionLabelProps {
  question: Question;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any; // react-pdf expects its own Style type
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
  const panelTitle = getPanelTitle(question);

  const titleStyles = [PDF_STYLES.rightAlign, PDF_STYLES.questionTitle, style];
  const subTitleStyles = [PDF_STYLES.rightAlign, PDF_STYLES.questionSubTitle];

  return (
    <View>
      <Text style={titleStyles}>{title}</Text>
      {panelTitle && <Text style={subTitleStyles}>{panelTitle}</Text>}
    </View>
  );
};
