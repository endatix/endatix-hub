import React from "react";
import { QuestionCustomModel, QuestionCompositeModel } from "survey-core";
import PdfAnswerViewer from "./pdf-answer-viewer";
import PdfCompositeAnswer from "./pdf-composite-answer";

interface PdfCustomAnswerProps {
  question: QuestionCustomModel | QuestionCompositeModel;
}

const PdfCustomAnswer = ({ question }: PdfCustomAnswerProps) => {
  if (question instanceof QuestionCompositeModel) {
    return <PdfCompositeAnswer question={question} />;
  }

  return <PdfAnswerViewer forQuestion={question.contentQuestion} hideTitle />;
};

export default PdfCustomAnswer;
