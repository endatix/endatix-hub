"use client";

import { PagedTableFooter } from "@/components/table/paged-table-footer";

const defaultPageSizeOptions = [10, 25, 50, 100] as const;

interface PagedListFooterProps {
  entityLabel: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeLabel?: string;
  pageSizeOptions?: readonly number[];
}

export function PagedListFooter({
  pageSizeLabel = "Per page",
  pageSizeOptions = defaultPageSizeOptions,
  ...props
}: Readonly<PagedListFooterProps>) {
  return (
    <PagedTableFooter
      {...props}
      pageSizeOptions={pageSizeOptions}
      rowsPerPageLabel={pageSizeLabel}
    />
  );
}
