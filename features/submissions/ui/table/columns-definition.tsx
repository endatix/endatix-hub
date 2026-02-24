import { DefinitionField, Submission } from "@/lib/endatix-api";
import { QUESTION_REGISTRY, QuestionType } from "@/lib/questions/questions-registry";
import { ColumnDef } from "@tanstack/react-table";
import { CellCompleteStatus } from "./cell-complete-status";
import { CellCompletionTime } from "./cell-completion-time";
import { CellDate } from "./cell-date";
import { CellStatusDropdown } from "./cell-status-dropdown";
import { ColumnHeader } from "./column-header";
import { RowActions } from "./row-actions";

export type ParsedSubmission = Submission & {
  parsedData: Record<string, any>;
};

export const COLUMNS_DEFINITION: ColumnDef<ParsedSubmission>[] = [
  {
    id: "actions",
    enableSorting: false,
    header: ({ column }) => (
      <ColumnHeader
        className="text-center hidden"
        column={column}
        title="Actions"
        visible={false}
      />
    ),
    cell: ({ row }) => <RowActions row={row} />,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <ColumnHeader
        className="hidden md:table-cell"
        column={column}
        isSorted={column.getIsSorted()}
        title="Created at"
      />
    ),
    cell: ({ row }) => <CellDate date={row.original.createdAt} />,
  },
  {
    id: "complete",
    accessorKey: "isComplete",
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title="Is Complete" />
    ),
    cell: ({ row }) => (
      <CellCompleteStatus isComplete={row.original.isComplete} />
    ),
  },
  {
    id: "completedAt",
    accessorKey: "completedAt",
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title="Completed at" />
    ),
    cell: ({ row }) => (
      <CellDate
        date={row.original.completedAt}
        visible={row.original.isComplete}
      />
    ),
  },
  {
    id: "completionTime",
    accessorFn: (row) =>
      row.completedAt
        ? new Date(row.completedAt).getTime() - new Date(row.createdAt).getTime()
        : -1,
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title="Completion Time" />
    ),
    cell: ({ row }) => (
      <CellCompletionTime
        startedAt={row.original.createdAt}
        completedAt={row.original.completedAt}
      />
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <ColumnHeader column={column} isSorted={column.getIsSorted()} title="Status" />,
    cell: ({ row }) => (
      <CellStatusDropdown
        code={row.original.status}
        submissionId={row.original.id}
        formId={row.original.formId}
      />
    ),
  },
];

export function buildSubmissionDataColumns(fields: DefinitionField[]): ColumnDef<ParsedSubmission>[] {
  return fields
    .filter((field) => {
      const questionType = field.type as QuestionType;
      return QUESTION_REGISTRY[questionType]?.supportedInGrid === true;
    })
    .map((field) => ({
      id: `data_${field.name}`,
      header: field.title,
      accessorFn: (row: ParsedSubmission) => {
        const value = row.parsedData?.[field.name];
        return value !== undefined && value !== null ? String(value) : null;
      },
      cell: ({ getValue }) => <span>{(getValue() as string) ?? "-"}</span>,
    }));
}
