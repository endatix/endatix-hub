import React from "react";
import { QuestionCustomModel, QuestionCompositeModel } from "survey-core";
import type { PdfFormChrome } from "../pdf-form-field";
import PdfAnswerViewer from "../pdf-answer-viewer";
import PdfCompositeAnswer from "./pdf-composite-answer";

interface PdfCustomAnswerProps {
  question: QuestionCustomModel | QuestionCompositeModel;
  chrome: PdfFormChrome;
}

const PdfCustomAnswer = ({ question, chrome }: PdfCustomAnswerProps) => {
  if (question instanceof QuestionCompositeModel) {
    return <PdfCompositeAnswer question={question} chrome={chrome} />;
  }

  return (
    <PdfAnswerViewer
      forQuestion={question.contentQuestion}
      hideTitle
      chrome={chrome}
    />
  );
};

export default PdfCustomAnswer;
