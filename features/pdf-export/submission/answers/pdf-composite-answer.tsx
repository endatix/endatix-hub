import React from "react";
import {
  Question,
  QuestionCompositeModel,
  QuestionNonValue,
} from "survey-core";
import PdfAnswerViewer from "../pdf-answer-viewer";

interface PdfCompositeAnswerProps {
  question: QuestionCompositeModel;
}

const PdfCompositeAnswer = ({ question }: PdfCompositeAnswerProps) => {
  if (!question) {
    return null;
  }

  const childQuestions = question?.contentPanel
    ?.getQuestions(true)
    ?.filter((q: Question) => !(q instanceof QuestionNonValue));

  return (
    <React.Fragment>
      {childQuestions?.map((childQuestion: Question) => (
        <PdfAnswerViewer key={childQuestion.id} forQuestion={childQuestion} />
      ))}
    </React.Fragment>
  );
};

export default PdfCompositeAnswer;
