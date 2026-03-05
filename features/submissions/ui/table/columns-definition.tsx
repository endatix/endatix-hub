import { DefinitionField, Submission } from "@/lib/endatix-api";
import { QUESTION_REGISTRY, QuestionType } from "@/lib/questions/questions-registry";
import { ColumnDef } from "@tanstack/react-table";
import { CellCompleteStatus } from "./cell-complete-status";
import { CellCompletionTime } from "./cell-completion-time";
import { CellDate } from "./cell-date";
import { CellStatusDropdown } from "./cell-status-dropdown";
import { ColumnHeader } from "./column-header";
import { RowActions } from "./row-actions";
import "./types";

export type ParsedSubmission = Submission & {
  parsedData: Record<string, any>;
};

export const COLUMNS_DEFINITION: ColumnDef<ParsedSubmission>[] = [
  {
    id: "actions",
    enableSorting: false,
    meta: {
      displayName: "Actions",
    },
    header: ({ column }) => (
      <ColumnHeader
        className="text-center hidden"
        column={column}
        title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        visible={false}
      />
    ),
    cell: ({ row }) => <RowActions row={row} />,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    meta: {
      displayName: "Created at",
    },
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        isSorted={column.getIsSorted()}
        title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
      />
    ),
    cell: ({ row }) => <CellDate date={row.original.createdAt} />,
  },
  {
    id: "complete",
    accessorKey: "isComplete",
    meta: {
      displayName: "Is Complete",
    },
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title={column.columnDef.meta?.displayName ?? (column.id || "Column")} />
    ),
    cell: ({ row }) => (
      <CellCompleteStatus isComplete={row.original.isComplete} />
    ),
  },
  {
    id: "completedAt",
    accessorKey: "completedAt",
    meta: {
      displayName: "Completed at",
    },
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title={column.columnDef.meta?.displayName ?? (column.id || "Column")} />
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
    meta: {
      displayName: "Completion Time",
    },
    header: ({ column }) => (
      <ColumnHeader column={column} isSorted={column.getIsSorted()} title={column.columnDef.meta?.displayName ?? (column.id || "Column")} />
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
    meta: {
      displayName: "Status",
    },
    header: ({ column }) => <ColumnHeader column={column} isSorted={column.getIsSorted()} title={column.columnDef.meta?.displayName!} />,
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
