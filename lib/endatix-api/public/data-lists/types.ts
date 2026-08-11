export interface DataListChoiceItem {
  value: string;
  /** Localized labels map (always includes `default`). Mapped to SurveyJS `text` in Hub. */
  labels: Record<string, string>;
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
   * Comparison used for query against Value and label keys.
   * Omit for API default (Contains).
   */
  matchMode?: DataListSearchMatchMode;
  /**
   * Optional locale for which single label key to prefer when includeLocales is omitted.
   */
  locale?: string;
  /**
   * Locales to include in labels projection and multi-key search.
   * Sent as repeated includeLocales query params.
   */
  includeLocales?: string[];
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
  /** Optional locales for labels projection on display-values. */
  includeLocales?: string[];
  locale?: string;
}
