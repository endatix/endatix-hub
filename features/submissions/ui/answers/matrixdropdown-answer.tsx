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

const FIRST_COLUMN_WIDTH_CSS_CLASSES = "min-w-[100px] max-w-[160px]";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
  className?: string;
}

const MatrixDropdownAnswer = ({
  question,
  className,
}: MatrixDropdownAnswerProps) => {
  const headerCells = useMemo(() => {
    return question.renderedTable.headerRow?.cells ?? [];
  }, [question, question.renderedTable, (question as any)?.survey?.locale]);

  const renderedRows = useMemo(() => {
    return question.renderedTable.renderedRows.filter(
      (row) => !row.isErrorsRow,
    );
  }, [question, question.renderedTable, (question as any)?.survey?.locale]);

  return (
    <div className={cn(className, "flex flex-col gap-2")}>
      <ScrollArea className="overflow-x-auto">
        <Table className="table-auto">
          <TableCaption>
            Answers for the &quot;{question.title}&quot; question
          </TableCaption>
          <TableHeader>
            <TableRow>
              {headerCells.map((cell, index) => (
                <TableHead
                  className={index === 0 ? FIRST_COLUMN_WIDTH_CSS_CLASSES : ""}
                  key={index}
                >
                  {cell.hasTitle ? cell.locTitle?.textOrHtml : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  const cellClass =
                    cellIndex === 0 ? FIRST_COLUMN_WIDTH_CSS_CLASSES : "";
                  if (cell.hasQuestion) {
                    return (
                      <TableCell
                        key={cellIndex}
                        className={cn("justify-start", cellClass)}
                      >
                        <AnswerViewer forQuestion={cell.question} />
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={cellIndex}
                      className={cn("font-medium", cellClass)}
                    >
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
