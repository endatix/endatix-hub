export interface DataListSummary {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | Date | null;
  modifiedAt?: string | Date | null;
  items?: DataListItem[];
}

export interface DataListsPageResponse {
  page: string | number;
  pageSize: string | number;
  totalRecords: string | number;
  totalPages: string | number;
  items: DataListSummary[];
}

export interface DataListChoiceItem {
  label: string;
  value: string;
}

export interface DataListItem {
  id?: number;
  label: string;
  value: string;
}

export interface DataListDetails {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
  items: DataListItem[];
}

export interface CreateDataListRequest {
  name: string;
  description?: string;
}

export interface ReplaceDataListItemsRequest {
  items: DataListItem[];
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

export type PublicDataListTokenType = "AccessToken" | "SubmissionToken";

export interface PublicDataListRequestBase {
  formId: string;
  dataListId: string;
  token?: string;
  tokenType?: PublicDataListTokenType;
}

export interface PublicDataListSearchRequest extends PublicDataListRequestBase {
  query?: string;
  skip?: number;
  take?: number;
}

export interface PublicDataListDisplayValuesRequest extends PublicDataListRequestBase {
  values: string[];
}
