import type { IPagedRequest } from "../shared/types";
import type { DataListSearchMatchMode } from "../public/data-lists/types";

export interface DataList {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt?: Date;
  itemsCount: number;
  defaultLocale?: string;
  availableLocales?: string[];
}

export interface DataListDetails extends DataList {
  items: DataListItem[];
}

export interface DataListChoiceItem {
  value: string;
  labels: Record<string, string>;
}

export interface DataListItem {
  id: string;
  labels: Record<string, string>;
  value: string;
}

export interface CreateDataListRequest {
  name: string;
  description?: string;
}

/** Omitted fields keep current values; empty description clears it. */
export interface UpdateDataListDetailsRequest {
  name?: string;
  description?: string;
}

export type DataListListSortBy =
  | "name"
  | "createdAt"
  | "modifiedAt"
  | "itemsCount"
  | "isActive";

export type DataListListSortDir = "asc" | "desc";

export interface ListDataListsRequest extends IPagedRequest {
  search?: string;
  hasLocale?: string;
  sortBy?: DataListListSortBy;
  sortDir?: DataListListSortDir;
  /** Inclusive UTC calendar day `YYYY-MM-DD`. */
  createdFrom?: string;
  /** Inclusive UTC calendar day `YYYY-MM-DD`. */
  createdTo?: string;
  /** Inclusive UTC calendar day `YYYY-MM-DD`. */
  modifiedFrom?: string;
  /** Inclusive UTC calendar day `YYYY-MM-DD`. */
  modifiedTo?: string;
}

export interface ListDataListItemsRequest extends IPagedRequest {
  query?: string;
  matchMode?: DataListSearchMatchMode;
  locale?: string;
  includeLocales?: string[];
}

export type { DataListSearchMatchMode };

export type DataListExportFormat = "csv" | "json";

export type ImportDataListRequest =
  | {
      format: "json";
      items: DataListChoiceItem[];
      csv?: never;
      ensureLocales?: string[];
    }
  | {
      format: "csv";
      csv: string;
      items?: never;
      ensureLocales?: string[];
    };

export interface FormDependencySummary {
  id: string;
  name?: string | null;
  description?: string | null;
  isEnabled: boolean;
  isPublic: boolean;
}
