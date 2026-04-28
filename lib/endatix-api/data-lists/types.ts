export interface DataListSummary {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
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

export interface DataListPublicSearchResult {
  dataListId: number;
  total: number;
  skip: number;
  take: number;
  items: DataListChoiceItem[];
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

export interface PublicDataListDisplayValuesRequest
  extends PublicDataListRequestBase {
  values: string[];
}
