import type { IPagedRequest } from "../shared/types";

export type PlatformAdminListScope = "all" | "approved" | "candidates";

export type PlatformAdminListSortBy = "email" | "userName" | "lastLoginAt";

export interface ListPlatformAdminsRequest extends IPagedRequest {
  search?: string;
  scope?: PlatformAdminListScope;
  tenantId?: string;
  sortBy?: PlatformAdminListSortBy;
  sortDir?: "asc" | "desc";
  lastLoginFrom?: string;
  lastLoginTo?: string;
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
