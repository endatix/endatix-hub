import type { SearchParam } from "@/lib/utils/next-utils";
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
  page?: SearchParam;
  pageSize?: SearchParam;
  search?: SearchParam;
  sortBy?: SearchParam;
  sortDir?: SearchParam;
  createdFrom?: SearchParam;
  createdTo?: SearchParam;
  modifiedFrom?: SearchParam;
  modifiedTo?: SearchParam;
}

export interface PlatformConfigStatus {
  label: string;
  status: "set" | "not-set";
  description: string;
}
