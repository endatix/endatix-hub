export interface DataList {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt?: Date;
  itemsCount: number;
}

export interface DataListDetails extends DataList {
  items: DataListItem[];
}

export interface DataListChoiceItem {
  label: string;
  value: string;
}

export interface DataListItem {
  id: string;
  label: string;
  value: string;
}

export interface CreateDataListRequest {
  name: string;
  description?: string;
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

export interface DataListPublicChoiceItem {
  label: string;
  value: string;
}

export interface DataListPublicSearchResult {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: DataListPublicChoiceItem[];
}
