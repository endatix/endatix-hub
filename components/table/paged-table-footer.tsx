"use client";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";

const defaultPageSizeOptions = [10, 25, 50, 100] as const;

export interface PagedTableFooterProps {
  entityLabel: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

export function PagedTableFooter({
  entityLabel,
  page,
  pageSize,
  totalPages,
  totalRecords,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = defaultPageSizeOptions,
}: Readonly<PagedTableFooterProps>) {
  const showingFrom = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalRecords);
  const displayPage = totalPages === 0 ? 0 : page;

  return (
    <CardFooter className="flex flex-col gap-3 border-t py-4 sm:flex-row sm:justify-between">
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <span>
          Showing {showingFrom}-{showingTo} of {totalRecords} {entityLabel}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Page {displayPage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </CardFooter>
  );
}

export function createPagedTableFooterProps<T>(
  paged: NormalizedPagedResponse<T>,
  entityLabel: string,
  updateUrl: UrlSearchParamsUpdater,
): PagedTableFooterProps {
  return {
    entityLabel,
    page: paged.page,
    pageSize: paged.pageSize,
    totalPages: paged.totalPages,
    totalRecords: paged.totalRecords,
    hasNextPage: paged.hasNextPage,
    onPageChange: (page) => updateUrl({ page: String(page) }),
    onPageSizeChange: (pageSize) =>
      updateUrl({
        pageSize: String(pageSize),
        page: "1",
      }),
  };
}
