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

/**
 * Public DataList search match mode (API enum names).
 * SurveyJS searchMode maps to Contains / StartsWith only.
 */
export type DataListSearchMatchMode = "Contains" | "StartsWith" | "Exact";

export interface PublicDataListSearchRequest {
  formId: string;
  dataListId: string;
  /** Optional per-request token override. Falls back to client-level accessToken when omitted. */
  formAccessJwt?: string;
  query?: string;
  /**
   * Comparison used for query against the resolved label key (not Value).
   * Omit for API default (Contains).
   */
  matchMode?: DataListSearchMatchMode;
  /**
   * Optional locale for which label key to search.
   * Omitted / default / list default culture → Labels.default; catalog locale (e.g. es) → that key.
   */
  locale?: string;
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
