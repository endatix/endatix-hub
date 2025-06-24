import React from "react";
import { Text, StyleSheet, View } from "@react-pdf/renderer";
import { PanelModel, Question, QuestionCustomModel } from "survey-core";
import { PDF_STYLES } from "@/features/pdf-export/components/pdf-styles";

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

const getPanelTitle = (question: Question) => {
  const panel = question.parent;

  if (panel instanceof PanelModel) {
    return panel.processedTitle ?? panel.title;
  }

  if (panel.isPage) {
    return panel.shortcutText ?? "";
  }

  return "";
};

export const PDF_LABEL_STYLES = StyleSheet.create({
  rightAlign: {
    textAlign: "right",
  },
});

export const PdfQuestionLabel = ({
  question,
  style,
}: PdfQuestionLabelProps) => {
  const title = getProcessedTitle(question);
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
