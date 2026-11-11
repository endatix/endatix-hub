import type {
  DataListChoiceItem,
  DataListSearchMatchMode,
} from "@/lib/endatix-api/data-lists/types";

export type DataListItemsLocaleOptions = {
  locale?: string;
  includeLocales?: string[];
};

export type DataListItemsRangeRequest = DataListItemsLocaleOptions & {
  query?: string;
  matchMode?: DataListSearchMatchMode;
  skip: number;
  take: number;
};

export type DataListItemsRange = {
  items: DataListChoiceItem[];
  totalRecords: number;
};
