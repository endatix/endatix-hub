"use client";

import {
  DataTableToolbar,
  ResetFiltersButton,
  TableSearchInput,
} from "@/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import type { SignupRequestsUrlState } from "../signup-requests-url-state";
import { DEFAULT_SIGNUP_REQUEST_STATUS_FILTER } from "../types";

interface SignupRequestsToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  urlState: SignupRequestsUrlState;
}

export function SignupRequestsToolbar({
  search,
  setSearch,
  updateUrl,
  urlState,
}: Readonly<SignupRequestsToolbarProps>) {
  const hasActiveFilters = Boolean(
    search.trim() || urlState.status !== DEFAULT_SIGNUP_REQUEST_STATUS_FILTER,
  );
  const hasSorting = Boolean(urlState.sortBy);

  const resetFilters = (): void => {
    setSearch("");
    updateUrl({ search: null, status: null, page: "1" });
  };

  const resetSorting = (): void => {
    updateUrl({ sortBy: null, sortDir: null, page: "1" });
  };

  const resetAll = (): void => {
    setSearch("");
    updateUrl({
      search: null,
      status: null,
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  };

  return (
    <DataTableToolbar
      className="mb-4"
      filters={
        <>
          <TableSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by email or company"
            ariaLabel="Search signup requests"
            className="min-w-[12rem] flex-none lg:flex-1"
          />
          <Select
            value={urlState.status}
            onValueChange={(status) =>
              updateUrl({
                status:
                  status === DEFAULT_SIGNUP_REQUEST_STATUS_FILTER
                    ? null
                    : status,
                page: "1",
              })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[160px]"
              aria-label="Filter signup requests by status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
          <ResetFiltersButton
            onClick={resetFilters}
            onResetSorting={resetSorting}
            onResetAll={resetAll}
            hasFilters={hasActiveFilters}
            hasSorting={hasSorting}
          />
        </>
      }
    />
  );
}
