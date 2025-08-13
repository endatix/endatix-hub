import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import { ValueTooltip } from "./value-tooltip";

interface MatrixAnswerProps {
  question: Partial<QuestionMatrixModel>;
  className?: string;
}

interface IMatrixAnswer {
  question: string;
  answer: string;
}

const MatrixAnswer = ({ question, className }: MatrixAnswerProps) => {
  const matrixAnswers = (() => {
    if (!question.rows || !question.columns) {
      return [];
    }

    const answers: Array<IMatrixAnswer> = [];
    question.rows.forEach((row: ItemValue) => {
      if (!question?.value || !question?.columns) {
        return;
      }
      const rowText = row.text;
      const answer = question.value[row.value]; // Using row.value which is standard
      const answerText =
        question.columns.find((c: ItemValue) => c.value === answer)?.text ?? "";

      if (answerText && rowText) {
        answers.push({
          question: rowText,
          answer: answerText,
        });
      }
    });

    return answers;
  })();

  if (!matrixAnswers || matrixAnswers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        <em>No answer</em>
      </p>
    );
  }

  return (
    <Table className={cn("table-auto", className)}>
      <TableCaption>
        Answers for the &quot;{question.title}&quot; question
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3">Question</TableHead>
          <TableHead>Answer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrixAnswers.map((answer) => (
          <TableRow key={answer.question}>
            <TableCell className="font-medium">{answer.question}</TableCell>
            <TableCell className="flex flex-row items-center gap-2">
              {answer.answer}
              <ValueTooltip value={answer.answer} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default MatrixAnswer;
