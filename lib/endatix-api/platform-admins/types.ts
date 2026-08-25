import type {
  DateRangeFilter,
  IPagedRequest,
  SortRequest,
} from "../shared/types";

export type PlatformAdminListScope = "all" | "approved" | "candidates";

export type PlatformAdminListSortBy = "email" | "userName" | "lastLoginAt";

export interface ListPlatformAdminsRequest
  extends
    IPagedRequest,
    SortRequest<PlatformAdminListSortBy>,
    DateRangeFilter<"lastLogin"> {
  search?: string;
  scope?: PlatformAdminListScope;
  tenantId?: string;
}

export interface PlatformAdminUserListItem {
  id: string;
  tenantId: string;
  tenantName?: string | null;
  userName: string;
  email?: string | null;
  displayName?: string | null;
  authProvider: string;
  isExternal: boolean;
  isVerified: boolean;
  isLockedOut: boolean;
  lastLoginAt?: string | null;
  hasExternalPlatformAdminRole: boolean;
  roles: string[];
}

export interface PlatformAdminOperationResponse {
  isSuccess: boolean;
  message: string;
}
