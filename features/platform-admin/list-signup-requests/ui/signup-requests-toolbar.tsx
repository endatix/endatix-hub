"use client";

import {
  DataTableFilter,
  DataTableToolbar,
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
  onClearFilters: () => void;
}

export function SignupRequestsToolbar({
  search,
  setSearch,
  updateUrl,
  urlState,
  onClearFilters,
}: Readonly<SignupRequestsToolbarProps>) {
  const hasStatusFilter =
    urlState.status !== DEFAULT_SIGNUP_REQUEST_STATUS_FILTER;
  const hasActiveFilters = Boolean(search.trim() || hasStatusFilter);
  const hasSorting = Boolean(urlState.sortBy);

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
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by email or company"
          ariaLabel="Search signup requests"
          className="min-w-[12rem] md:flex-none lg:flex-1"
        />
      }
      filters={
        <StatusFilter
          value={urlState.status}
          onChange={(status) =>
            updateUrl({
              status:
                status === DEFAULT_SIGNUP_REQUEST_STATUS_FILTER ? null : status,
              page: "1",
            })
          }
        />
      }
      activeFilterCount={hasStatusFilter ? 1 : 0}
      reset={{
        onClick: onClearFilters,
        onResetSorting: resetSorting,
        onResetAll: resetAll,
        hasFilters: hasActiveFilters,
        hasSorting,
      }}
    />
  );
}

function StatusFilter({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (status: string) => void }>) {
  return (
    <DataTableFilter label="Status">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            className="w-full md:w-[160px]"
            aria-label={id ? undefined : "Filter signup requests by status"}
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
      )}
    </DataTableFilter>
  );
}
