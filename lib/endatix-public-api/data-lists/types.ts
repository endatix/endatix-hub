export interface DataListChoiceItem {
  label: string;
  value: string;
}

export interface DataListPublicSearchResult {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
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

export interface PublicDataListDisplayValuesRequest extends PublicDataListRequestBase {
  values: string[];
}
