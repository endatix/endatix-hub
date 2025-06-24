import { QuestionCustomModel, QuestionCompositeModel } from "survey-core";
import CompositeAnswer from "./composite-answer";
import AnswerViewer from "./answer-viewer";

interface CustomAnswerProps extends React.HtmlHTMLAttributes<HTMLInputElement> {
  question: QuestionCustomModel | QuestionCompositeModel;
  className?: string;
}

const CustomAnswer = ({ question, className }: CustomAnswerProps) => {
  if (question instanceof QuestionCompositeModel) {
    return <CompositeAnswer question={question} className={className} />;
  }

  return (
    <AnswerViewer
      forQuestion={question.contentQuestion}
      className={className}
      isCustomQuestion={false}
    />
  );
};

export default CustomAnswer;
