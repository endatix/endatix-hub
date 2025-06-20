import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { QuestionMatrixDropdownModel } from "survey-core";
import AnswerViewer from "./answer-viewer";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
  className?: string;
}

const MatrixDropdownAnswer = ({
  question,
  className,
}: MatrixDropdownAnswerProps) => {
  return (
    <div className={cn(className, "flex flex-col gap-2")}>
      <ScrollArea className="overflow-x-auto">
        <Table>
          <TableCaption>
            Answers for the &quot;{question.title}&quot; question
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              {question.visibleRows.map((row) => (
                <TableHead key={row.id}>{row.text}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {question.columns.map((column, columnIndex) => (
              <TableRow key={column.name}>
                <TableCell className="font-medium">{column.title}</TableCell>
                {question.visibleRows.map((row, rowIndex) => {
                  const cellQuestion = row.cells[columnIndex]?.question;
                  return (
                    <TableCell key={row.id} className="justify-start">
                      <AnswerViewer key={rowIndex} forQuestion={cellQuestion} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default MatrixDropdownAnswer;
