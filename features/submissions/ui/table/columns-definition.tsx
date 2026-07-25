import { TruncatedId } from "@/components/common/truncated-id";
import { DefinitionField, Submission } from "@/lib/endatix-api";
import {
  QUESTION_REGISTRY,
  QuestionType,
} from "@/lib/questions/questions-registry";
import { getSubmissionStartedAt } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";
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
  submitterDisplayIdFilter?: string;
  onSubmitterDisplayIdFilterChange?: (value: string) => void;
  submitterEmailFilter?: string;
  onSubmitterEmailFilterChange?: (value: string) => void;
}

const submitterPrimaryFilterLabel =
  process.env.NEXT_PUBLIC_SUBMITTER_PRIMARY_FILTER_LABEL?.trim() || "Submitter";

/** Shrink-wrap column to content so leftover width goes to Status. */
const SHRINK_WRAP = "w-[1%] whitespace-nowrap";

export function buildSubmissionSystemColumns({
  dateFilters,
  onDateFilterChange,
  submitterDisplayIdFilter = "",
  onSubmitterDisplayIdFilterChange,
  submitterEmailFilter = "",
  onSubmitterEmailFilterChange,
}: SubmissionSystemColumnsOptions = {}): ColumnDef<ParsedSubmission>[] {
  return [
    {
      id: "actions",
      enableSorting: false,
      meta: {
        displayName: "Actions",
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
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
        displayName: "Created",
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
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
        displayName: "Complete",
        headerClassName: SHRINK_WRAP,
        cellClassName: `${SHRINK_WRAP} text-center`,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
          title="Complete"
          titleContent={
            <CheckCircle2
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
      ),
      cell: ({ row }) => (
        <CellCompleteStatus isComplete={row.original.isComplete} />
      ),
    },
    {
      id: "startedAt",
      accessorKey: "startedAt",
      meta: {
        displayName: "Started",
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
          dateFilter={
            dateFilters && onDateFilterChange
              ? {
                  value: dateFilters.startedAt,
                  onChange: (value) => onDateFilterChange("startedAt", value),
                }
              : undefined
          }
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.startedAt} />,
    },
    {
      id: "completedAt",
      accessorKey: "completedAt",
      meta: {
        displayName: "Completed",
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
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
      id: "submitterDisplayId",
      accessorKey: "submitterDisplayId",
      meta: {
        displayName: submitterPrimaryFilterLabel,
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
          textFilter={
            onSubmitterDisplayIdFilterChange
              ? {
                  value: submitterDisplayIdFilter,
                  placeholder: submitterPrimaryFilterLabel,
                  onChange: onSubmitterDisplayIdFilterChange,
                }
              : undefined
          }
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
      ),
      cell: ({ row }) => (
        <TruncatedId id={row.original.submitterDisplayId ?? ""} />
      ),
    },
    ...buildSubmitterProfileColumns({
      submitterEmailFilter,
      onSubmitterEmailFilterChange,
    }),
    {
      id: "completionTime",
      accessorFn: (row) =>
        row.completedAt
          ? new Date(row.completedAt).getTime() -
            getSubmissionStartedAt(row).getTime()
          : -1,
      meta: {
        displayName: "Time",
        headerClassName: SHRINK_WRAP,
        cellClassName: SHRINK_WRAP,
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
          title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
        />
      ),
      cell: ({ row }) => (
        <CellCompletionTime
          startedAt={getSubmissionStartedAt(row.original)}
          completedAt={row.original.completedAt}
        />
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        displayName: "Status",
        headerClassName: "min-w-[7.5rem]",
        cellClassName: "min-w-[7.5rem]",
      },
      header: ({ column }) => (
        <ColumnHeader
          column={column}
          isSorted={column.getIsSorted()}
          density="compact"
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

function buildSubmitterProfileColumns({
  submitterEmailFilter = "",
  onSubmitterEmailFilterChange,
}: Pick<
  SubmissionSystemColumnsOptions,
  "submitterEmailFilter" | "onSubmitterEmailFilterChange"
> = {}): ColumnDef<ParsedSubmission>[] {
  return getSubmitterGridProfileFields().map((field) => ({
    id: `submitterProfile_${field}`,
    enableSorting: false,
    meta: {
      displayName: humanizeFieldName(field),
      headerClassName: SHRINK_WRAP,
      cellClassName: SHRINK_WRAP,
    },
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        density="compact"
        textFilter={
          field.toLowerCase() === "email" && onSubmitterEmailFilterChange
            ? {
                value: submitterEmailFilter,
                placeholder: "Email",
                onChange: onSubmitterEmailFilterChange,
              }
            : undefined
        }
        title={column.columnDef.meta?.displayName ?? (column.id || "Column")}
      />
    ),
    accessorFn: (row) => row.submitterProfile?.[field] ?? null,
    cell: ({ getValue }) => <span>{(getValue() as string) ?? "-"}</span>,
  }));
}

function getSubmitterGridProfileFields(): string[] {
  return (process.env.NEXT_PUBLIC_SUBMITTER_GRID_PROFILE_FIELDS ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
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
      enableSorting: false,
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
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}
