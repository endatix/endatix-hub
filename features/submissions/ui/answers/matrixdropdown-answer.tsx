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
import { QuestionMatrixDropdownModel } from "survey-core";
import AnswerViewer from "./answer-viewer";

const FIRST_COLUMN_WIDTH_CSS_CLASSES = "min-w-[90px] max-w-[140px]";
const DATA_COLUMN_WIDTH_CSS_CLASSES = "min-w-[130px]";
const DENSE_CELL_PADDING = "px-2 py-2";

interface MatrixDropdownAnswerProps {
  question: QuestionMatrixDropdownModel;
  className?: string;
}

const MatrixDropdownAnswer = ({
  question,
  className,
}: MatrixDropdownAnswerProps) => {
  const headerCells = (() => {
    return question.renderedTable.headerRow?.cells ?? [];
  })();

  const renderedRows = (() => {
    return question.renderedTable.renderedRows.filter(
      (row) => !row.isErrorsRow,
    );
  })();

  return (
    <div className={cn(className, "flex min-w-0 flex-col gap-2")}>
      <div className="w-full overflow-x-auto">
        <Table className="table-auto">
          <TableCaption>
            Answers for the &quot;
            {htmlSanitizer.toPlainText(question.title ?? "")}&quot; question
          </TableCaption>
          <TableHeader>
            <TableRow>
              {headerCells.map((cell, index) => (
                <TableHead
                  className={cn(
                    "h-auto break-words whitespace-normal",
                    DENSE_CELL_PADDING,
                    index === 0
                      ? FIRST_COLUMN_WIDTH_CSS_CLASSES
                      : DATA_COLUMN_WIDTH_CSS_CLASSES,
                  )}
                  key={index}
                >
                  {cell.hasTitle
                    ? htmlSanitizer.toPlainText(cell.locTitle?.textOrHtml ?? "")
                    : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  const cellClass =
                    cellIndex === 0
                      ? FIRST_COLUMN_WIDTH_CSS_CLASSES
                      : DATA_COLUMN_WIDTH_CSS_CLASSES;
                  if (cell.hasQuestion) {
                    return (
                      <TableCell
                        key={cellIndex}
                        className={cn(
                          "justify-start align-top break-words whitespace-normal",
                          DENSE_CELL_PADDING,
                          cellClass,
                        )}
                      >
                        <AnswerViewer forQuestion={cell.question} />
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={cellIndex}
                      className={cn(
                        "align-top font-medium break-words whitespace-normal",
                        DENSE_CELL_PADDING,
                        cellClass,
                      )}
                    >
                      {cell.hasTitle
                        ? htmlSanitizer.toPlainText(
                            cell.locTitle.textOrHtml ?? "",
                          )
                        : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MatrixDropdownAnswer;
