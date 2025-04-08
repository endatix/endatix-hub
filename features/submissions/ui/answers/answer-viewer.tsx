import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { QuestionType } from "@/lib/questions";
import React from "react";
import {
  Question,
  QuestionCheckboxModel,
  QuestionCompositeModel,
  QuestionFileModel,
  QuestionMultipleTextModel,
  QuestionSignaturePadModel,
} from "survey-core";
import CheckboxAnswer from "./checkbox-answer";
import CommentAnswer from "./comment-answer";
import CompositeAnswer from "./composite-answer";
import DropdownAnswer from "./dropdown-answer";
import { FileAnswer } from "./file-answer";
import MatrixAnswer from "./matrix-answer";
import MultipleTextAnswer from "./multipletext-answer";
import RadioGroupAnswer from "./radiogroup-answer";
import RankingAnswer from "./ranking-answer";
import RatingAnswer from "./rating-answer";
import { SignaturePadAnswer } from "./signaturepad-answer";
import UnknownAnswerViewer from "./unknown-answer";

export interface ViewAnswerProps
  extends React.HtmlHTMLAttributes<HTMLInputElement> {
  forQuestion: Question;
  className?: string;
}

const AnswerViewer = ({
  forQuestion,
  className,
}: ViewAnswerProps): React.JSX.Element => {
  const questionType = forQuestion.getType() ?? "unsupported";

  if (forQuestion instanceof QuestionCompositeModel) {
    return <CompositeAnswer question={forQuestion} className={className} />;
  }

  const renderTextAnswer = () => (
    <Input
      disabled
      id={forQuestion.name}
      value={forQuestion.value ?? "N/A"}
      className={className}
    />
  );

  const renderBooleanAnswer = () => (
    <Checkbox disabled checked={forQuestion.value} className={className} />
  );

  const renderCheckboxAnswer = () => (
    <CheckboxAnswer
      question={forQuestion as QuestionCheckboxModel}
      className={className}
    />
  );

  const renderRatingAnswer = () => (
    <RatingAnswer question={forQuestion} className={className} />
  );

  const renderRadiogroupAnswer = () => (
    <RadioGroupAnswer question={forQuestion} className={className} />
  );

  const renderDropdownAnswer = () => (
    <DropdownAnswer question={forQuestion} className={className} />
  );

  const renderRankingAnswer = () => (
    <RankingAnswer question={forQuestion} className={className} />
  );

  const renderMatrixAnswer = () => (
    <MatrixAnswer question={forQuestion} className={className} />
  );

  const renderCommentAnswer = () => (
    <CommentAnswer question={forQuestion} className={className} />
  );

  const renderFileAnswer = () => (
    <FileAnswer
      question={forQuestion as QuestionFileModel}
      className={className}
    />
  );

  const renderSignaturePadAnswer = () => (
    <SignaturePadAnswer
      className={className}
      question={forQuestion as QuestionSignaturePadModel}
    />
  );

  const renderMultipleTextAnswer = () => (
    <MultipleTextAnswer
      question={forQuestion as QuestionMultipleTextModel}
      className={className}
    />
  );

  const renderUnknownAnswer = () => (
    <UnknownAnswerViewer forQuestion={forQuestion} className={className} />
  );

  switch (questionType) {
    case QuestionType.Text:
      return renderTextAnswer();
    case QuestionType.Boolean:
      return renderBooleanAnswer();
    case QuestionType.Checkbox:
      return renderCheckboxAnswer();
    case QuestionType.Rating:
      return renderRatingAnswer();
    case QuestionType.Radiogroup:
      return renderRadiogroupAnswer();
    case QuestionType.Dropdown:
      return renderDropdownAnswer();
    case QuestionType.Ranking:
      return renderRankingAnswer();
    case QuestionType.Matrix:
      return renderMatrixAnswer();
    case QuestionType.Comment:
      return renderCommentAnswer();
    case QuestionType.File:
    case QuestionType.Video:
      return renderFileAnswer();
    case QuestionType.SignaturePad:
      return renderSignaturePadAnswer();
    case QuestionType.MultipleText:
      return renderMultipleTextAnswer();
    default:
      return renderUnknownAnswer();
  }
};

export default AnswerViewer;
