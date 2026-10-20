import type {
  SubmissionGridColumn,
  SubmissionGridSearchSource,
} from "@/lib/endatix-api/reporting/submission-grid-types";

/** A question answer filters can use, as the form's settings list it. */
export type FilterableQuestion = {
  key: string;
  title: string;
  source: SubmissionGridSearchSource;
  preparing: boolean;
};

/**
 * The form's search keys in schema order. Only an API that reports
 * `searchSource` can say which questions they are.
 */
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
