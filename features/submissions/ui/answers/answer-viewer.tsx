import { Input } from "@/components/ui/input";
import { QuestionType } from "@/lib/questions";
import React from "react";
import {
  Question,
  QuestionBooleanModel,
  QuestionCheckboxModel,
  QuestionCompositeModel,
  QuestionCustomModel,
  QuestionDropdownModel,
  QuestionFileModel,
  QuestionMatrixDropdownModel,
  QuestionMultipleTextModel,
  QuestionPanelDynamicModel,
  QuestionSignaturePadModel,
} from "survey-core";
import CommentAnswer from "./comment-answer";
import DropdownAnswer from "./dropdown-answer";
import { FileAnswer } from "./file-answer";
import MatrixAnswer from "./matrix-answer";
import MultipleTextAnswer from "./multipletext-answer";
import RadioGroupAnswer from "./radiogroup-answer";
import RankingAnswer from "./ranking-answer";
import RatingAnswer from "./rating-answer";
import { SignaturePadAnswer } from "./signaturepad-answer";
import UnknownAnswerViewer from "./unknown-answer";
import PanelDynamicAnswer from "./paneldynamic-answer";
import CheckboxAnswer from "./checkbox-answer";
import MatrixDropdownAnswer from "./matrixdropdown-answer";
import TagBoxAnswer from "./tagbox-answer";
import BooleanAnswer from "./boolean-answer";
import CustomAnswer from "./custom-answer";

export interface ViewAnswerProps
  extends React.HtmlHTMLAttributes<HTMLInputElement> {
  forQuestion: Question;
  className?: string;
  isCustomQuestion?: boolean;
}

const AnswerViewer = ({
  forQuestion,
  className,
}: ViewAnswerProps): React.JSX.Element => {
  const questionType = forQuestion.getType() ?? "unsupported";

  if (
    forQuestion instanceof QuestionCustomModel ||
    forQuestion instanceof QuestionCompositeModel
  ) {
    return (
      <CustomAnswer
        question={forQuestion as QuestionCustomModel | QuestionCompositeModel}
        className={className}
      />
    );
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
    <BooleanAnswer
      question={forQuestion as QuestionBooleanModel}
      className={className}
    />
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
    <DropdownAnswer
      question={forQuestion as QuestionDropdownModel}
      className={className}
    />
  );

  const renderRankingAnswer = () => (
    <RankingAnswer question={forQuestion} className={className} />
  );

  const renderMatrixAnswer = () => (
    <MatrixAnswer question={forQuestion} className={className} />
  );

  const renderMatrixDropdownAnswer = () => (
    <MatrixDropdownAnswer
      question={forQuestion as QuestionMatrixDropdownModel}
      className={className}
    />
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

  const renderPanelDynamicAnswer = () => (
    <PanelDynamicAnswer
      question={forQuestion as QuestionPanelDynamicModel}
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

  const renderTagBoxAnswer = () => (
    <TagBoxAnswer question={forQuestion} className={className} />
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
    case QuestionType.MatrixDropdown:
    case QuestionType.MatrixDynamic:
      return renderMatrixDropdownAnswer();
    case QuestionType.Comment:
      return renderCommentAnswer();
    case QuestionType.File:
      return renderFileAnswer();
    case QuestionType.PanelDynamic:
      return renderPanelDynamicAnswer();
    case QuestionType.SignaturePad:
      return renderSignaturePadAnswer();
    case QuestionType.MultipleText:
      return renderMultipleTextAnswer();
    case QuestionType.TagBox:
      return renderTagBoxAnswer();
    default:
      return renderUnknownAnswer();
  }
};

export default AnswerViewer;
