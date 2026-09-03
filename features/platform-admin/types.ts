import type { SearchParamValue } from "@/lib/utils/next-utils";
import type { Session } from "next-auth";

export type PlatformAdminSession = Session;

export interface PlatformAdminSearchParams {
  page?: SearchParamValue;
  pageSize?: SearchParamValue;
  search?: SearchParamValue;
  scope?: SearchParamValue;
  tenantId?: SearchParamValue;
}

export interface PlatformTenantSearchParams {
  page?: SearchParamValue;
  pageSize?: SearchParamValue;
  search?: SearchParamValue;
  sortBy?: SearchParamValue;
  sortDir?: SearchParamValue;
  createdFrom?: SearchParamValue;
  createdTo?: SearchParamValue;
  modifiedFrom?: SearchParamValue;
  modifiedTo?: SearchParamValue;
}

export interface PlatformConfigStatus {
  label: string;
  status: "set" | "not-set";
  description: string;
}
