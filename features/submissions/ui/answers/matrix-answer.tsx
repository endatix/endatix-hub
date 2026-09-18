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
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
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
      const rowText = row.hasText
        ? htmlSanitizer.toPlainText(row.text)
        : `Row ${index + 1}`;
      const answer = question.value[row.value];
      const columnText =
        question.columns.find((c: ItemValue) => c.value === answer)?.text ?? "";
      const answerText = htmlSanitizer.toPlainText(columnText);

      if (answerText) {
        answers.push({
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
          Answers for the &quot;
          {htmlSanitizer.toPlainText(question.title ?? "")}&quot; question
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
