import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MatrixDropdownColumn,
  MatrixDropdownRowModelBase,
  QuestionMatrixDropdownModel,
} from "survey-core";

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
      <h4 className="text-sm font-medium text-muted-foreground">
        {question.title}
      </h4>

      <ScrollArea className="overflow-x-auto">
        <div className="grid grid-cols-5 col-span-5 gap-4 mb-2 ">
          <Label className="col-span-2"></Label>
          <div className="text-center">
            {question.columns.map((column: MatrixDropdownColumn) => (
              <div
                key={column.name}
                className="text-sm font-medium col-span-1 border-b border-color-bg-accent"
              >
                {column.title}
              </div>
            ))}
          </div>
        </div>
        {question.rows.map(
          (row: MatrixDropdownRowModelBase, rowIndex: number) => {
            const rowValues = question.getRowValue(rowIndex);
            return (
              <div
                key={row.value}
                className="grid grid-cols-5 col-span-5 space-y-2 border-b border-color-bg-accent lg:border-none"
              >
                <MatrixDropdownRowLabel
                  key={row.value}
                  row={row}
                  className="col-span-2"
                />
                <div className="flex gap-4">
                  {question.columns.map((column: MatrixDropdownColumn) => (
                    <div
                      key={column.value}
                      className="text-center w-full text-sm col-span-1 flex justify-center"
                    >
                      <MatrixDropdownCellValue
                        value={rowValues?.[column.name]}
                        cellType={column.cellType}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          },
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

type MatrixDropdownCellType =
  | "dropdown"
  | "checkbox"
  | "radiogroup"
  | "tagbox"
  | "text"
  | "comment"
  | "boolean"
  | "expression"
  | "rating"
  | "default";

// Function to safely convert string to MatrixDropdownCellType
const toCellType = (cellTypeStr: string): MatrixDropdownCellType => {
  const validTypes: MatrixDropdownCellType[] = [
    "dropdown",
    "checkbox",
    "radiogroup",
    "tagbox",
    "text",
    "comment",
    "boolean",
    "expression",
    "rating",
    "default",
  ];

  return validTypes.includes(cellTypeStr as MatrixDropdownCellType)
    ? (cellTypeStr as MatrixDropdownCellType)
    : "default";
};

interface MatrixDropdownCellValueProps {
  value: string | number | null;
  cellType: string;
}
const MatrixDropdownCellValue = ({
  value,
  cellType,
}: MatrixDropdownCellValueProps) => {
  const typedCellType = toCellType(cellType);

  switch (typedCellType) {
    case "boolean":
      return (
        <div className="text-center w-full text-sm col-span-1 flex justify-center">
          <Checkbox disabled checked={value === "true"} />
        </div>
      );
    case "dropdown":
      return (
        <div className="text-center w-full text-sm col-span-1 flex justify-center">
          <Select disabled>
            <SelectTrigger className={cn("w-[180px]")}>
              <SelectValue placeholder={value as string} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={value as string}>{value as string}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return (
        <div className="text-center w-full text-sm col-span-1 flex justify-center">
          {value ?? "-"}
        </div>
      );
  }
};

const MatrixDropdownRowLabel = ({
  row,
  className,
}: {
  row: MatrixDropdownRowModelBase;
  className?: string;
}) => {
  return (
    <Label
      htmlFor={row.value}
      className={cn(
        "pl-8 text-right text-sm text-muted-foreground sticky left-0",
        className,
      )}
    >
      {row.text}
    </Label>
  );
};

export default MatrixDropdownAnswer;
