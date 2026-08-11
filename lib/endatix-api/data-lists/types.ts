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

export type DataListExportFormat = "csv" | "json";

export interface ImportDataListRequest {
  format: DataListExportFormat;
  items?: DataListChoiceItem[];
  csv?: string;
  ensureLocales?: string[];
}

export interface DataListExportResult {
  body: string;
  fileName: string;
  contentType: string;
}

export interface ReplaceDataListItemsRequest {
  items: DataListChoiceItem[];
}

export interface FormDependencySummary {
  id: string;
  name?: string | null;
  description?: string | null;
  isEnabled: boolean;
  isPublic: boolean;
}
