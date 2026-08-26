import type { Session } from "next-auth";

export type PlatformAdminSession = Session;

export interface PlatformAdminSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  scope?: string;
  tenantId?: string;
}

export interface PlatformTenantSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
}

export interface PlatformConfigStatus {
  label: string;
  status: "set" | "not-set";
  description: string;
}
