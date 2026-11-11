import type { DataListLabelOptions } from "@/lib/survey-features/data-lists";
import type {
  DataListChoiceItem,
  DataListSearchMatchMode,
} from "@/lib/endatix-api/data-lists/types";

export type DataListItemsRangeRequest = DataListLabelOptions & {
  query?: string;
  matchMode?: DataListSearchMatchMode;
  skip: number;
  take: number;
};

export type DataListItemsRange = {
  items: DataListChoiceItem[];
  totalRecords: number;
};
