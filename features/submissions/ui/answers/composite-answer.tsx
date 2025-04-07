import { Minus } from "lucide-react";
import { Question, QuestionCompositeModel } from "survey-core";
import { cn } from "@/lib/utils";
import AnswerViewer from "./answer-viewer";

interface CompositeAnswer extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionCompositeModel;
}
const CompositeAnswer = ({ question, className }: CompositeAnswer) => {
  if (question === undefined) {
    return <Minus className="h-4 w-4" />;
  }

  const childQuestions = question.contentPanel?.getQuestions(true);

  return (
    <div
      className={cn(
        "flex items-start justify-start flex-col gap-2 w-full",
        className,
      )}
    >
      {childQuestions?.map((childQuestion: Question) => (
        <AnswerViewer key={childQuestion.id} forQuestion={childQuestion} />
      ))}
    </div>
  );
};

export default CompositeAnswer;
