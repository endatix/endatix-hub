import type {
  AuditDateFilters,
  IPagedRequest,
  SortRequest,
} from "../shared/types";

export type PlatformTenantListSortBy = "name" | "createdAt" | "modifiedAt";

export interface ListPlatformTenantsRequest
  extends
    IPagedRequest,
    SortRequest<PlatformTenantListSortBy>,
    AuditDateFilters {
  search?: string;
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
