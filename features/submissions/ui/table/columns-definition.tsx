import { DefinitionField, Submission } from "@/lib/endatix-api";
import {
  QUESTION_REGISTRY,
  QuestionType,
} from "@/lib/questions/questions-registry";
import { ColumnDef } from "@tanstack/react-table";
import { CellCompleteStatus } from "./cell-complete-status";
import { CellCompletionTime } from "./cell-completion-time";
import { CellDate } from "./cell-date";
import { CellStatusDropdown } from "./cell-status-dropdown";
import { ColumnHeader } from "./column-header";
import type {
  DateFilterChangeHandler,
  SubmissionDateFilters,
} from "./date-filter-types";
import { RowActions } from "./row-actions";
import "./types";

export type ParsedSubmission = Submission & {
  parsedData: Record<string, any>;
};

interface SubmissionSystemColumnsOptions {
  dateFilters?: SubmissionDateFilters;
  onDateFilterChange?: DateFilterChangeHandler;
}

export function buildSubmissionSystemColumns({
  dateFilters,
  onDateFilterChange,
}: SubmissionSystemColumnsOptions = {}): ColumnDef<ParsedSubmission>[] {
  return [
    {
      id: "actions",
      enableSorting: false,
      meta: {
        displayName: "Actions",
      },
      header: ({ column }) => (
        <ColumnHeader
          className="hidden text-center"
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
          dateFilter={
            dateFilters && onDateFilterChange
              ? {
                  value: dateFilters.createdAt,
                  onChange: (value) => onDateFilterChange("createdAt", value),
                }
              : undefined
          }
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
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
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
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          dateFilter={
            dateFilters && onDateFilterChange
              ? {
                  value: dateFilters.completedAt,
                  onChange: (value) => onDateFilterChange("completedAt", value),
                }
              : undefined
          }
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
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
          ? new Date(row.completedAt).getTime() -
            new Date(row.createdAt).getTime()
          : -1,
      meta: {
        displayName: "Completion Time",
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
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
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
      ),
      cell: ({ row }) => (
        <CellStatusDropdown
          code={row.original.status}
          submissionId={row.original.id}
          formId={row.original.formId}
        />
      ),
    },
  ];
}

export const COLUMNS_DEFINITION = buildSubmissionSystemColumns();

export function buildSubmissionDataColumns(
  fields: DefinitionField[],
): ColumnDef<ParsedSubmission>[] {
  return fields
    .filter((field) => {
      const questionType = field.type as QuestionType;
      return QUESTION_REGISTRY[questionType]?.supportedInGrid === true;
    })
    .map((field) => ({
      id: `data_${field.name}`,
      meta: {
        defaultHidden: true,
        displayName: humanizeFieldName(field.name),
      },
      header: humanizeFieldName(field.name),
      accessorFn: (row: ParsedSubmission) => {
        const value = row.parsedData?.[field.name];
        return value !== undefined && value !== null ? String(value) : null;
      },
      cell: ({ getValue }) => <span>{(getValue() as string) ?? "-"}</span>,
    }));
}

export function humanizeFieldName(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
