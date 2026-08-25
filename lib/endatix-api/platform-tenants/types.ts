import type { IPagedRequest } from "../shared/types";

export type PlatformTenantListSortBy = "name" | "createdAt" | "modifiedAt";

export interface ListPlatformTenantsRequest extends IPagedRequest {
  search?: string;
  sortBy?: PlatformTenantListSortBy;
  sortDir?: "asc" | "desc";
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
}

export interface PlatformTenantListItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  modifiedAt?: string | null;
  formsCount: number;
  submissionsCount: number;
}
