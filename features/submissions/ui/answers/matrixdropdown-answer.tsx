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
import { useMemo } from "react";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
  className?: string;
}

const MatrixDropdownAnswer = ({
  question,
  className,
}: MatrixDropdownAnswerProps) => {
  const headerCells = useMemo(() => {
    return question.renderedTable.headerRow.cells;
  }, [question]);

  const renderedRows = useMemo(() => {
    return question.renderedTable.renderedRows.filter(
      (row) => !row.isErrorsRow,
    );
  }, [question]);

  return (
    <div className={cn(className, "flex flex-col gap-2")}>
      <ScrollArea className="overflow-x-auto">
        <Table>
          <TableCaption>
            Answers for the &quot;{question.title}&quot; question
          </TableCaption>
          <TableHeader>
            <TableRow>
              {headerCells.map((cell, index) => {
                if (cell.hasTitle) {
                  return (
                    <TableHead key={index}>
                      {cell.locTitle?.textOrHtml}
                    </TableHead>
                  );
                }

                return <TableHead key={index} />;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  if (cell.hasQuestion) {
                    return (
                      <TableCell key={cellIndex} className="justify-start">
                        <AnswerViewer forQuestion={cell.question} />
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={cellIndex} className="font-medium">
                      {cell.hasTitle ? cell.locTitle.textOrHtml : null}
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
