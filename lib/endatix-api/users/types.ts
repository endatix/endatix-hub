import type { IPagedRequest } from "../shared/types";

export type UserListItem = {
  id: string;
  userName: string;
  email: string | null;
  isVerified: boolean;
  roles: string[];
  authProvider: string;
  isExternal: boolean;
  isLockedOut: boolean;
  displayName?: string | null;
  lastLoginAt?: string | null;
  dateAdded?: string | null;
};

export type UserStatusFilter = "active" | "pending" | "locked";

export type UserListSortBy = "userName" | "email" | "lastLoginAt";

export interface ListUsersRequest extends IPagedRequest {
  search?: string;
  role?: string;
  status?: UserStatusFilter;
  sortBy?: UserListSortBy;
  sortDir?: "asc" | "desc";
  lastLoginFrom?: string;
  lastLoginTo?: string;
}

export type CreateUserRequestBody = {
  email: string;
  roles?: string[];
};

export type UserOperationResponse = {
  success: boolean;
  message: string;
};

export type ReplaceRolesRequestBody = {
  roleNames: string[];
};
