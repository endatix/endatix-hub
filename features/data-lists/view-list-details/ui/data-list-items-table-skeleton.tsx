'use client';

import {
  DataTableSurface,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from '@/components/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SKELETON_ROWS = 8;

type DataListItemsTableSkeletonProps = {
  /** Approximate locale columns to render (Value is always included). */
  localeColumnCount?: number;
};

export function DataListItemsTableSkeleton({
  localeColumnCount = 3,
}: Readonly<DataListItemsTableSkeletonProps>) {
  const localeHeaders = Array.from(
    { length: Math.max(1, localeColumnCount) },
    (_, index) => `Locale ${index + 1}`,
  );

  return (
    <DataTableSurface data-slot="data-list-items-table-skeleton">
      <div className="w-full overflow-x-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="bg-surface-container-low">
            <TableRow className="border-0 hover:bg-transparent">
              {['Value', ...localeHeaders].map((title) => (
                <TableHead
                  key={title}
                  className={dataTableHeaderCellClassName({})}
                >
                  <span className={dataTableColumnLabelClassName()}>
                    {title}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => {
              const isEvenRow = rowIndex % 2 === 1;
              return (
                <TableRow
                  key={rowIndex}
                  className={dataTableBodyRowClassName({ isEvenRow })}
                >
                  {Array.from(
                    { length: 1 + localeHeaders.length },
                    (_, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          isPinnedLeft: cellIndex === 0,
                        })}
                      >
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </DataTableSurface>
  );
}
