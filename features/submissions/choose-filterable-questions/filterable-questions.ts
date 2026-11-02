import type {
  SubmissionGridColumn,
  SubmissionGridSearchSource,
} from "@/lib/endatix-api/reporting/submission-grid-types";

export type FilterableQuestion = {
  key: string;
  title: string;
  source: SubmissionGridSearchSource;
  preparing: boolean;
};

/** Only an API that reports `searchSource` can say which columns are keys. */
export function listFilterableQuestions(
  columns: readonly SubmissionGridColumn[],
): FilterableQuestion[] {
  return columns.flatMap((column) =>
    column.searchable && column.searchSource
      ? [
          {
            key: column.key,
            title: column.title || column.key,
            source: column.searchSource,
            preparing: column.searchPending === true,
          },
        ]
      : [],
  );
}
