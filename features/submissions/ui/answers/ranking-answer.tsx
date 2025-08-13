import { cn } from "@/lib/utils";
import { GripVertical, Minus } from "lucide-react";
import { Question } from "survey-core";

interface RankingAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

const RankingAnswer = ({
  question,
  className,
  ...props
}: RankingAnswerProps) => {
  const rankedAnswers: string[] = question.value;
  const getDisplayText = (value: string) => {
    const choice = question.choices?.find((c: any) => c.value === value);
    return choice?.title ?? choice?.text ?? value;
  };
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {rankedAnswers.length > 0 ? (
        rankedAnswers.map((answer) => (
          <div key={answer} className="flex items-center text-sm">
            <GripVertical className="w-4 h-4 cursor-not-allowed text-muted-foreground" />
            <span className="pl-2">{getDisplayText(answer)}</span>
          </div>
        ))
      ) : (
        <Minus className="h-4 w-4" />
      )}
    </div>
  );
};

export default RankingAnswer;
