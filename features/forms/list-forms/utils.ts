import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type { FormsListRequest } from "@/lib/endatix-api/forms/types";

export const DEFAULT_FORMS_PAGE_SIZE = 25;

export type FormsBrowseMode = "unassigned" | "all";

export type RootFormsViewMode = "unassigned" | "all" | "global-search";

export interface FormsListSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  visibility?: string;
  browse?: string;
}

export type FormsListScope =
  | { kind: "root" }
  | { kind: "folder"; folderId: string };

const allStatusesValue = "__all_statuses__";
const allVisibilityValue = "__all_visibility__";
export const allBrowseScopesValue = "__all_browse_scopes__";
export const unassignedBrowseValue = "unassigned";

export { allStatusesValue, allVisibilityValue };

export function parseFormsBrowseMode(
  value: string | null | undefined,
): FormsBrowseMode {
  return value === "all" ? "all" : "unassigned";
}

export function hasActiveFormsListFiltersFromParams(
  searchParams?: FormsListSearchParams,
): boolean {
  const search = searchParams?.search?.trim();
  const status = searchParams?.status;
  const visibility = searchParams?.visibility;

  return (
    Boolean(search) ||
    status === "enabled" ||
    status === "disabled" ||
    visibility === "public" ||
    visibility === "private"
  );
}

export function hasActiveFormsListFilters(
  searchParams: URLSearchParams,
): boolean {
  return hasActiveFormsListFiltersFromParams({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    visibility: searchParams.get("visibility") ?? undefined,
  });
}

export function resolveRootFormsViewMode(
  searchParams?: FormsListSearchParams,
): RootFormsViewMode {
  if (hasActiveFormsListFiltersFromParams(searchParams)) {
    return "global-search";
  }

  if (parseFormsBrowseMode(searchParams?.browse) === "all") {
    return "all";
  }

  return "unassigned";
}

export function shouldHideFolderShortcuts(
  searchParams?: FormsListSearchParams,
): boolean {
  return hasActiveFormsListFiltersFromParams(searchParams);
}

export function shouldShowGlobalSearchAlert(
  searchParams?: FormsListSearchParams,
): boolean {
  return hasActiveFormsListFiltersFromParams(searchParams);
}

export function isTenantWideFormsList(
  searchParams?: FormsListSearchParams,
  scope?: FormsListScope,
): boolean {
  if (scope?.kind === "folder") {
    return false;
  }

  return (
    hasActiveFormsListFiltersFromParams(searchParams) ||
    parseFormsBrowseMode(searchParams?.browse) === "all"
  );
}

export function resolveRootBrowseLabel(viewMode: RootFormsViewMode): {
  heading: string;
  description: string;
} {
  switch (viewMode) {
    case "global-search":
      return {
        heading: "Search forms",
        description:
          "Searching all forms by title, status, or visibility across every folder.",
      };
    case "all":
      return {
        heading: "All forms",
        description: "Browse all forms in your organization.",
      };
    default:
      return {
        heading: "Unassigned forms",
        description: "Browse forms not assigned to a folder.",
      };
  }
}

export function resolveFormsSearchPlaceholder(options: {
  variant: "root" | "folder";
  viewMode?: RootFormsViewMode | null;
}): string {
  if (options.variant === "folder") {
    return "Search forms in this folder";
  }

  switch (options.viewMode) {
    case "global-search":
    case "all":
      return "Search all forms";
    default:
      return "Search unassigned forms";
  }
}

/**
 * Parses forms list search params from the URL.
 * Root scope: unassigned by default, tenant-wide when browse=all or filters active.
 * Folder scope: always limited to the folder.
 */
export function parseFormsListParams(
  searchParams?: FormsListSearchParams,
  scope?: FormsListScope,
): FormsListRequest {
  const paging = parsePagedSearchParams(searchParams, DEFAULT_FORMS_PAGE_SIZE);
  const status = searchParams?.status;
  const visibility = searchParams?.visibility;

  const base: FormsListRequest = {
    ...paging,
    search: searchParams?.search?.trim() || undefined,
    isEnabled:
      status === "enabled" ? true : status === "disabled" ? false : undefined,
    isPublic:
      visibility === "public"
        ? true
        : visibility === "private"
          ? false
          : undefined,
  };

  if (scope?.kind === "folder") {
    return { ...base, folderId: scope.folderId };
  }

  if (isTenantWideFormsList(searchParams, scope)) {
    return base;
  }

  return { ...base, unassignedOnly: true };
}

export function parseFormsStatusFilter(
  value: string | null | undefined,
): string {
  if (value === "enabled" || value === "disabled") {
    return value;
  }

  return allStatusesValue;
}

export function parseFormsVisibilityFilter(
  value: string | null | undefined,
): string {
  if (value === "public" || value === "private") {
    return value;
  }

  return allVisibilityValue;
}

export type FormFolderContext = {
  name: string;
  immutable: boolean;
  isActive: boolean;
};

export function buildFolderContextById(
  folders: ReadonlyArray<{
    id: string;
    name: string;
    immutable: boolean;
    isActive: boolean;
  }>,
): ReadonlyMap<string, FormFolderContext> {
  return new Map(
    folders.map((folder) => [
      folder.id,
      {
        name: folder.name,
        immutable: folder.immutable,
        isActive: folder.isActive,
      },
    ]),
  );
}
