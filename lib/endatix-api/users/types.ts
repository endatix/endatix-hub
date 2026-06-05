import type { IPagedRequest } from '../shared/types';

export type UserListItem = {
  id: string;
  userName: string;
  email: string;
  isVerified: boolean;
  roles: string[];
  dateAdded?: string | null;
};

export type UserStatusFilter = 'active' | 'pending';

export interface ListUsersRequest extends IPagedRequest {
  search?: string;
  role?: string;
  status?: UserStatusFilter;
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
