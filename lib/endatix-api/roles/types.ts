export type RoleTypeFilter = "all" | "system" | "custom";

export interface ListRolesRequest {
  page?: number;
  pageSize?: number;
  roleType?: RoleTypeFilter;
  search?: string;
}

export type RoleListItem = {
  id: number;
  name: string;
  description?: string | null;
  isSystemDefined: boolean;
  isActive: boolean;
  permissions: string[];
  usersCount: number;
};

export type PermissionListItem = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  isSystemDefined: boolean;
};

export type CreateRoleRequestBody = {
  name: string;
  description?: string;
  permissions: string[];
};

export type UpdateRoleRequestBody = {
  description?: string;
  permissions: string[];
};

export type RoleOperationResponse = {
  id?: string;
  message?: string;
};
