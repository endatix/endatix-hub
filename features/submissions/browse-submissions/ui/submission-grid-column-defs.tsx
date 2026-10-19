"use client";

import { TruncatedId } from "@/components/common/truncated-id";
import {
  CellDate,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  DataTableColumnHeader,
  type DataTableColumnHeaderProps,
} from "@/components/table";
import type { DateFilterValue } from "@/components/table/date-filter-types";
import "@/components/table/data-table-column-meta";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import {
  answerColumnId,
  isSubmitterProfileColumn,
  submitterProfileField,
  type AnswerColumn,
} from "../submission-grid-columns";
import type { SubmissionGridDateStem } from "../submission-grid-url-updates";
import { ReviewStatusCell } from "./review-status-cell";
import {
  AnswerCell,
  CollectionStatusCell,
  CompletionTimeCell,
} from "./submission-grid-cells";
import { SubmissionGridRowActions } from "./submission-grid-row-actions";

type GridColumn = ColumnDef<SubmissionGridRow>;
type GridHeader = HeaderContext<SubmissionGridRow, unknown>;

type TextFilter = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

type DateFilter = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
};

export type SubmissionGridColumnFilters = {
  dates: Record<SubmissionGridDateStem, DateFilterValue>;
  onDateChange: (stem: SubmissionGridDateStem, value: DateFilterValue) => void;
  submitterDisplayId: TextFilter;
  submitterEmail: TextFilter;
  /** "Contains" on a column whose filter type is `text`. */
  answerText: (column: AnswerColumn) => TextFilter;
  /** From/To on a `date` or `datetime` column. */
  answerDate: (column: AnswerColumn) => DateFilter;
};

const COMPACT_COLUMN = "w-12 whitespace-nowrap";
const BADGE_COLUMN = `${DATA_TABLE_SHRINK_WRAP_CLASS_NAME} whitespace-nowrap`;
const FLUID_COLUMN = "min-w-[6.5rem]";
const ANSWER_COLUMN = "min-w-[8rem]";

const DATE_COLUMNS = [
  { id: "modifiedAt", stem: "modified", title: "Last modified" },
  { id: "startedAt", stem: "started", title: "Started" },
  { id: "completedAt", stem: "completed", title: "Completed" },
  { id: "createdAt", stem: "created", title: "Created" },
] as const;

/**
 * The grid's columns: its own metadata columns, then the visible answer
 * columns in view order. Ids of the metadata columns are the keys a saved
 * view stores.
 */
export function buildSubmissionGridColumns(
  answerColumns: readonly AnswerColumn[],
  filters: SubmissionGridColumnFilters,
): GridColumn[] {
  return [
    actionsColumn(),
    collectionStatusColumn(),
    ...DATE_COLUMNS.map((date) => dateColumn(date, filters)),
    submitterDisplayIdColumn(filters.submitterDisplayId),
    completionTimeColumn(),
    reviewStatusColumn(),
    ...answerColumns.map((column) => answerColumn(column, filters)),
  ];
}

function header(title: string, extra: Partial<HeaderProps> = {}) {
  function GridColumnHeader({ column }: GridHeader) {
    return (
      <DataTableColumnHeader
        column={column}
        title={title}
        isSorted={column.getIsSorted()}
        density="compact"
        {...extra}
      />
    );
  }
  return GridColumnHeader;
}

type HeaderProps = Omit<
  DataTableColumnHeaderProps<SubmissionGridRow, unknown>,
  "column" | "title"
>;

function sized(className: string) {
  return { headerClassName: className, cellClassName: className };
}

function actionsColumn(): GridColumn {
  return {
    id: "actions",
    enableSorting: false,
    meta: sized(COMPACT_COLUMN),
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <SubmissionGridRowActions row={row.original} />,
  };
}

function collectionStatusColumn(): GridColumn {
  return {
    id: "complete",
    enableSorting: false,
    meta: sized(BADGE_COLUMN),
    header: header("Status"),
    cell: ({ row }) => <CollectionStatusCell row={row.original} />,
  };
}

function dateColumn(
  { id, stem, title }: (typeof DATE_COLUMNS)[number],
  filters: SubmissionGridColumnFilters,
): GridColumn {
  return {
    id,
    accessorKey: id,
    enableSorting: true,
    meta: sized(FLUID_COLUMN),
    header: header(title, {
      dateFilter: {
        value: filters.dates[stem],
        onChange: (value) => filters.onDateChange(stem, value),
      },
    }),
    cell: ({ row }) => <CellDate date={row.original[id]} />,
  };
}

function submitterDisplayIdColumn(filter: TextFilter): GridColumn {
  return {
    id: "submitterDisplayId",
    enableSorting: false,
    meta: sized(FLUID_COLUMN),
    header: header(filter.placeholder, { textFilter: filter }),
    cell: ({ row }) => (
      <TruncatedId id={row.original.submitterDisplayId ?? ""} />
    ),
  };
}

function completionTimeColumn(): GridColumn {
  return {
    id: "completionTime",
    enableSorting: false,
    meta: sized(FLUID_COLUMN),
    header: header("Time"),
    cell: ({ row }) => <CompletionTimeCell row={row.original} />,
  };
}

function reviewStatusColumn(): GridColumn {
  return {
    id: "status",
    enableSorting: false,
    meta: sized("min-w-[7.5rem]"),
    header: header("Review"),
    cell: ({ row }) => <ReviewStatusCell row={row.original} />,
  };
}

function answerColumn(
  column: AnswerColumn,
  filters: SubmissionGridColumnFilters,
): GridColumn {
  return {
    id: answerColumnId(column.key),
    enableSorting: false,
    meta: sized(ANSWER_COLUMN),
    header: header(column.title, answerHeaderFilter(column, filters)),
    cell: ({ row }) => <AnswerCell row={row.original} column={column} />,
  };
}

/** Submitter email keeps the list's metadata filter on its column. */
function answerHeaderFilter(
  column: AnswerColumn,
  filters: SubmissionGridColumnFilters,
): Partial<HeaderProps> {
  const isEmail =
    isSubmitterProfileColumn(column) &&
    submitterProfileField(column.key).toLowerCase() === "email";
  return isEmail
    ? { textFilter: filters.submitterEmail }
    : answerFilterByType(column, filters);
}

function answerFilterByType(
  column: AnswerColumn,
  filters: SubmissionGridColumnFilters,
): Partial<HeaderProps> {
  switch (column.filterType) {
    case "text":
      return { textFilter: filters.answerText(column) };
    case "date":
    case "datetime":
      return { dateFilter: filters.answerDate(column) };
    default:
      return {};
  }
}
