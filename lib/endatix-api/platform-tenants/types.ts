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
  shortUrl: string;
  description?: string | null;
  createdAt: string;
  modifiedAt?: string | null;
  formsCount: number;
  submissionsCount: number;
  selfRegistrationEnabled: boolean;
}

export interface PlatformTenant {
  id: string;
  name: string;
  shortUrl: string;
  description?: string | null;
  allowSelfRegistration: boolean;
  allowedAuthProviderKeys: string[];
  defaultRegistrationRoleName: string;
  createdAt: string;
  modifiedAt?: string | null;
}

export interface CreatePlatformTenantRequest {
  name: string;
  description?: string | null;
  allowSelfRegistration: boolean;
  allowedAuthProviderKeys?: string[];
  defaultRegistrationRoleName?: string;
}

export interface UpdatePlatformTenantRequest {
  name?: string;
  description?: string | null;
  allowSelfRegistration?: boolean;
  allowedAuthProviderKeys?: string[];
  defaultRegistrationRoleName?: string;
}
