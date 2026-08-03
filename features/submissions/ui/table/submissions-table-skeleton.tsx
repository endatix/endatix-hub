import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUBMISSION_LIST_DEFAULT_PAGE_SIZE } from "@/features/submissions/list-submission-query/submission-list-query.constants";
import { cn } from "@/lib/utils";

const ROW_HEIGHT_CLASS = "h-[60px]";

/** Approximate system-column layout: actions, complete, dates, submitter, time, status. */
const SKELETON_COLUMNS = [
  { id: "actions", cell: "actions", headerClassName: "w-14" },
  { id: "complete", cell: "icon", headerClassName: "w-10" },
  { id: "modifiedAt", cell: "date", headerClassName: "min-w-[6rem]" },
  { id: "startedAt", cell: "date", headerClassName: "min-w-[6rem]" },
  { id: "completedAt", cell: "date", headerClassName: "min-w-[6rem]" },
  { id: "createdAt", cell: "date", headerClassName: "min-w-[6rem]" },
  { id: "submitter", cell: "id", headerClassName: "min-w-[6rem]" },
  { id: "time", cell: "short", headerClassName: "min-w-[4rem]" },
  { id: "status", cell: "badge", headerClassName: "min-w-[7.5rem]" },
] as const;

type SkeletonCellKind = (typeof SKELETON_COLUMNS)[number]["cell"];

interface SubmissionsTableSkeletonProps {
  pageSize?: number;
  /** Shown to screen readers while the table body is loading. */
  loadingLabel?: string;
}

interface SkeletonCellContentProps {
  kind: SkeletonCellKind;
}

function SkeletonCellContent({ kind }: Readonly<SkeletonCellContentProps>) {
  switch (kind) {
    case "actions":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm bg-muted-foreground/15 dark:bg-muted" />
          <Skeleton className="h-4 w-4 rounded-full bg-muted-foreground/15 dark:bg-muted" />
        </div>
      );
    case "icon":
      return (
        <Skeleton className="mx-auto h-4 w-4 rounded-full bg-muted-foreground/15 dark:bg-muted" />
      );
    case "date":
      return (
        <Skeleton className="h-4 w-20 bg-muted-foreground/15 dark:bg-muted" />
      );
    case "id":
      return (
        <Skeleton className="h-4 w-24 bg-muted-foreground/15 dark:bg-muted" />
      );
    case "short":
      return (
        <Skeleton className="h-4 w-10 bg-muted-foreground/15 dark:bg-muted" />
      );
    case "badge":
      return (
        <Skeleton className="h-7 w-[5.5rem] rounded-full bg-muted-foreground/15 dark:bg-muted" />
      );
  }
}

export function SubmissionsTableSkeleton({
  pageSize = SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
  loadingLabel = "Loading submissions…",
}: Readonly<SubmissionsTableSkeletonProps>) {
  const rows = Array.from({ length: pageSize }, (_, index) => index);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="relative w-full"
      data-testid="submissions-table-skeleton"
      role="status"
    >
      <span className="sr-only">{loadingLabel}</span>
      <div className="rounded-xl border border-border/40 bg-surface-container-lowest shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="bg-surface-container-low">
            <TableRow
              className={cn(ROW_HEIGHT_CLASS, "border-0 hover:bg-transparent")}
            >
              {SKELETON_COLUMNS.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "h-10 bg-surface-container-low px-2 shadow-[inset_0_-1px_0_0] shadow-border/30",
                    column.headerClassName,
                  )}
                >
                  <Skeleton className="h-3 w-16 bg-muted-foreground/20 dark:bg-muted" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isEvenRow = row % 2 === 1;
              return (
                <TableRow
                  key={row}
                  className={cn(
                    ROW_HEIGHT_CLASS,
                    "border-0",
                    isEvenRow
                      ? "bg-surface-container-low"
                      : "bg-surface-container-lowest",
                  )}
                >
                  {SKELETON_COLUMNS.map((column) => (
                    <TableCell key={column.id} className="px-2">
                      <SkeletonCellContent kind={column.cell} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-4 border-t border-border/30 px-4 py-3">
          <Skeleton className="h-4 w-32 bg-muted-foreground/15 dark:bg-muted" />
          <Skeleton className="h-8 w-40 bg-muted-foreground/15 dark:bg-muted" />
          <Skeleton className="h-8 w-48 bg-muted-foreground/15 dark:bg-muted" />
        </div>
      </div>
    </div>
  );
}
