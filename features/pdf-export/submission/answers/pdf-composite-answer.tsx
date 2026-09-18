import React from "react";
import {
  Question,
  QuestionCompositeModel,
  QuestionNonValue,
} from "survey-core";
import type { PdfFormChrome } from "../pdf-form-field";
import PdfAnswerViewer from "../pdf-answer-viewer";

interface PdfCompositeAnswerProps {
  question: QuestionCompositeModel;
  chrome: PdfFormChrome;
}

const PdfCompositeAnswer = ({
  question,
  chrome,
}: PdfCompositeAnswerProps) => {
  if (!question) {
    return null;
  }

  const childQuestions = question?.contentPanel
    ?.getQuestions(true)
    ?.filter((q: Question) => !(q instanceof QuestionNonValue));

  return (
    <React.Fragment>
      {childQuestions?.map((childQuestion: Question) => (
        <PdfAnswerViewer
          key={childQuestion.id}
          forQuestion={childQuestion}
          chrome={chrome}
        />
      ))}
    </React.Fragment>
  );
};

export default PdfCompositeAnswer;
