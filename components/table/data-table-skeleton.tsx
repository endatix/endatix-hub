import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import { DataTableSurface } from "./data-table-surface";

export interface DataTableSkeletonColumn {
  title: string;
  /** Applied to both the header cell and the body cells, as `ColumnMeta` does. */
  className?: string;
  /** Placeholder shape for this column; defaults to a short bar. */
  cell?: ReactNode;
}

interface DataTableSkeletonProps {
  columns: readonly DataTableSkeletonColumn[];
  rows?: number;
  className?: string;
  "data-slot"?: string;
}

const DEFAULT_ROWS = 8;

/**
 * Loading placeholder shaped like `DataTableGrid` plus a footer, so a list keeps
 * its header labels and row rhythm while its page streams in.
 */
export function DataTableSkeleton({
  columns,
  rows = DEFAULT_ROWS,
  className,
  ...props
}: Readonly<DataTableSkeletonProps>) {
  return (
    <DataTableSurface className={className} {...props}>
      <div className="w-full overflow-x-auto">
        <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
          <TableHeader className="bg-surface-container-low">
            <TableRow className="border-0 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.title}
                  className={dataTableHeaderCellClassName({
                    className: column.className,
                  })}
                >
                  <span className={dataTableColumnLabelClassName()}>
                    {column.title}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, rowIndex) => {
              const isEvenRow = rowIndex % 2 === 1;
              return (
                <TableRow
                  key={rowIndex}
                  className={dataTableBodyRowClassName({ isEvenRow })}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.title}
                      className={dataTableBodyCellClassName({
                        isEvenRow,
                        className: column.className,
                      })}
                    >
                      {column.cell ?? <Skeleton className="h-4 w-24" />}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border/40 px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </DataTableSurface>
  );
}
