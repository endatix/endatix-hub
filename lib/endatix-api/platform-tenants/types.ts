import type { IPagedRequest } from "../shared/types";

export interface ListPlatformTenantsRequest extends IPagedRequest {
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
