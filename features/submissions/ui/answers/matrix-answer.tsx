import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ItemValue, QuestionMatrixModel } from "survey-core";
import { ValueTooltip } from "./value-tooltip";

interface MatrixAnswerProps {
  question: Partial<QuestionMatrixModel>;
  className?: string;
}

interface IMatrixAnswer {
  rowKey: string;
  question: string;
  answer: string;
}

const MatrixAnswer = ({ question, className }: MatrixAnswerProps) => {
  const matrixAnswers = (() => {
    if (!question.rows || !question.columns) {
      return [];
    }

    const answers: Array<IMatrixAnswer> = [];
    question.rows.forEach((row: ItemValue, index: number) => {
      if (!question?.value || !question?.columns) {
        return;
      }
      // Image-only rows (matrix carousel) have no authored text — fall back
      // to a positional label instead of dropping the row from the table.
      // hasText (not a truthy check on .text): ItemValue.text always falls
      // back to String(value) when no text was authored, so `row.text ||
      // fallback` would never actually reach the fallback.
      const rowText = row.hasText ? row.text : `Row ${index + 1}`;
      const answer = question.value[row.value]; // Using row.value which is standard
      const answerText =
        question.columns.find((c: ItemValue) => c.value === answer)?.text ?? "";

      if (answerText) {
        answers.push({
          // row.value (not rowText) — SurveyJS enforces uniqueness on row
          // value (uniqueProperty: "value"), but two rows can share display
          // text, which would collide as a React key.
          rowKey: String(row.value),
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
    <div className={cn("w-full min-w-0 overflow-x-auto", className)}>
      <Table className="table-auto">
        <TableCaption>
          Answers for the &quot;{question.title}&quot; question
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3 break-words whitespace-normal">
              Question
            </TableHead>
            <TableHead className="break-words whitespace-normal">
              Answer
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixAnswers.map((answer) => (
            <TableRow key={answer.rowKey}>
              <TableCell className="font-medium break-words whitespace-normal">
                {answer.question}
              </TableCell>
              <TableCell className="break-words whitespace-normal">
                <div className="flex items-start gap-2">
                  {answer.answer}
                  <ValueTooltip value={answer.answer} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MatrixAnswer;
