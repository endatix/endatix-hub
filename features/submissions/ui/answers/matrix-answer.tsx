import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import React from "react";
import { ItemValue, QuestionMatrixModel } from "survey-core";

interface MatrixAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Partial<QuestionMatrixModel>;
}

interface MatrixAnswer {
  question: string;
  answer: string;
}

const MatrixAnswer = ({ question, className }: MatrixAnswerProps) => {
  const matrixAnswers = React.useMemo(() => {
    if (!question.rows || !question.columns) {
      return [];
    }

    const answers: Array<MatrixAnswer> = [];
    question.rows.forEach((row: { text: string; id: number }) => {
      if (!question?.value || !question?.columns) {
        return;
      }
      const rowText = row.text;
      const answer = question.value[row.id];
      const answerText =
        question.columns.find((c: ItemValue) => c.value === answer)?.title ??
        "";

      if (answerText && rowText) {
        answers.push({
          question: rowText,
          answer: answerText,
        });
      }
    });

    return answers;
  }, [question.rows, question.columns, question.value]);

  if (matrixAnswers.length === 0) {
    return <Minus className="h-4 w-4" />;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {matrixAnswers.map((answer) => (
        <div
          key={answer.question}
          className="grid grid-cols-5 col-span-5 gap-4"
        >
          <Label
            htmlFor={answer.question}
            className="pl-8 text-right col-span-2 text-sm text-muted-foreground col-span-2"
          >
            {answer.question}
          </Label>
          <div className="items-center text-left text-sm col-span-3">
            {answer.answer}
          </div>
        </div>
      ))}
      {matrixAnswers.length > 0 && <Separator className="col-span-5" />}
    </div>
  );
};

export default MatrixAnswer;
