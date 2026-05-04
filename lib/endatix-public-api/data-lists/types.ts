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

export interface PublicDataListSearchRequest {
  formId: string;
  dataListId: string;
  /** Optional per-request token override. Falls back to client-level accessToken when omitted. */
  formAccessJwt?: string;
  query?: string;
  skip?: number;
  take?: number;
}

export interface PublicDataListDisplayValuesRequest {
  /** The ID of the form that owns the runtime context for this data list. */
  formId: string;
  /** The ID of the data list. */
  dataListId: string;
  /** Optional per-request token override. Falls back to client-level accessToken when omitted. */
  formAccessJwt?: string;
  /** The values to get display values for. */
  values: string[];
}
