"use client";

import { Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import {
  allBrowseScopesValue,
  allStatusesValue,
  allVisibilityValue,
  hasActiveFormsListFilters,
  parseFormsBrowseMode,
  parseFormsStatusFilter,
  parseFormsVisibilityFilter,
  resolveFormsSearchPlaceholder,
  resolveRootFormsViewMode,
  unassignedBrowseValue,
  type RootFormsViewMode,
} from "../utils";

interface FormsListToolbarProps {
  variant: "root" | "folder";
}

export function FormsListToolbar({ variant }: Readonly<FormsListToolbarProps>) {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
  const statusFilter = parseFormsStatusFilter(searchParams.get("status"));
  const visibilityFilter = parseFormsVisibilityFilter(
    searchParams.get("visibility"),
  );
  const filtersActive = hasActiveFormsListFilters(searchParams);
  const viewMode: RootFormsViewMode | null =
    variant === "root"
      ? resolveRootFormsViewMode({
          search: searchParams.get("search") ?? undefined,
          status: searchParams.get("status") ?? undefined,
          visibility: searchParams.get("visibility") ?? undefined,
          browse: searchParams.get("browse") ?? undefined,
        })
      : null;

  let browseFilter = unassignedBrowseValue;
  if (viewMode === "global-search") {
    browseFilter = allBrowseScopesValue;
  } else if (parseFormsBrowseMode(searchParams.get("browse")) === "all") {
    browseFilter = "all";
  }

  const searchPlaceholder = resolveFormsSearchPlaceholder({
    variant,
    viewMode,
  });

  const clearFilters = () => {
    updateUrl({
      search: null,
      status: null,
      visibility: null,
      browse: null,
      page: "1",
    });
  };

  return (
    <section
      aria-label={
        variant === "folder"
          ? "Search and filter folder forms"
          : "Search and filter forms"
      }
      className={cn(
        "sticky top-16 z-30 -mx-10 mb-4 border-b bg-background/95 px-10 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "md:-mx-14 md:px-14 lg:-mx-16 lg:px-16",
      )}
    >
      <h2 className="sr-only">
        {variant === "folder" ? "Search forms in this folder" : "Search forms"}
      </h2>

      {viewMode === "global-search" ? (
        <Alert variant="info" className="mb-3 py-3">
          <Info />
          <AlertTitle>Searching all forms</AlertTitle>
          <AlertDescription>
            Results include forms in every folder. Clear filters to return to
            unassigned browse and folder shortcuts.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {variant === "root" && viewMode !== "global-search" ? (
            <Select
              value={browseFilter}
              onValueChange={(value) =>
                updateUrl({
                  browse: value === "all" ? "all" : null,
                  page: "1",
                })
              }
            >
              <SelectTrigger
                className="w-full sm:w-[180px]"
                aria-label="Forms browse scope"
              >
                <SelectValue placeholder="Browse scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={unassignedBrowseValue}>
                  Unassigned
                </SelectItem>
                <SelectItem value="all">All forms</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              updateUrl({
                status: value === allStatusesValue ? null : value,
                page: "1",
              })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[160px]"
              aria-label="Form status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allStatusesValue}>All statuses</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={visibilityFilter}
            onValueChange={(value) =>
              updateUrl({
                visibility: value === allVisibilityValue ? null : value,
                page: "1",
              })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[160px]"
              aria-label="Form visibility"
            >
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allVisibilityValue}>All visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
