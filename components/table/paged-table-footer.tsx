"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { formatInteger } from "@/lib/utils/formatters";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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
  rowsPerPageLabel?: string;
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
  rowsPerPageLabel = "Rows per page",
}: Readonly<PagedTableFooterProps>) {
  const showingFrom = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalRecords);
  const displayPage = totalPages === 0 ? 0 : page;
  const canGoPrevious = page > 1;
  const canGoNext = hasNextPage;

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex-1 text-sm text-muted-foreground">
        <span className="sm:hidden">
          {formatInteger(showingFrom)}-{formatInteger(showingTo)} of{" "}
          {formatInteger(totalRecords)}
        </span>
        <span className="hidden sm:inline">
          Showing {formatInteger(showingFrom)}-{formatInteger(showingTo)} of{" "}
          {formatInteger(totalRecords)} {entityLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="hidden text-sm font-medium sm:block">
            {rowsPerPageLabel}
          </p>
          <p className="text-sm font-medium sm:hidden">Rows</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-auto items-center justify-center text-sm font-medium sm:w-[100px]">
          <span className="sm:hidden">
            {formatInteger(displayPage)}/{formatInteger(totalPages)}
          </span>
          <span className="hidden sm:inline">
            Page {formatInteger(displayPage)} of {formatInteger(totalPages)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(Math.max(totalPages, 1))}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
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
    onPageChange: (nextPage) => updateUrl({ page: String(nextPage) }),
    onPageSizeChange: (nextPageSize) =>
      updateUrl({
        pageSize: String(nextPageSize),
        page: "1",
      }),
  };
}
