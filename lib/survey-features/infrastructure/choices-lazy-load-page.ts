/** Shared SurveyJS dropdown lazy-load page size (data lists, Theme Editor, …). */
export const DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE = 25;

export function mapSkipTakeToPage(
  skip: number,
  take: number,
): { page: number; pageSize: number } {
  const pageSize = take > 0 ? take : DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  const safeSkip = Math.max(skip, 0);
  const page = Math.floor(safeSkip / pageSize) + 1;
  return { page, pageSize };
}

/**
 * SurveyJS DropdownListModel (3.x) only requests the next page when
 * `(itemsSettings.skip + 1) < totalCount`. It increments `skip` by `take`
 * immediately after firing `onChoicesLazyLoad`, before `setItems`.
 *
 * After a full first page (skip=0, take=25), skip is already 25 when the
 * loading footer appears. A total of 0 (falsy → 0 in `setItems`) or 26
 * (`hasNextPage` as skip+length+1) makes `(25 + 1) < total` false: the
 * list stays on "Loading..." and never fires a second request.
 */
export function mapSurveyJsLazyLoadTotal(params: {
  skip: number;
  take: number;
  itemCount: number;
  totalRecords: number;
  hasNextPage?: boolean;
}): number {
  const skip = Math.max(params.skip, 0);
  const take = Math.max(0, params.take);
  const itemCount = Math.max(params.itemCount, 0);
  const reported =
    typeof params.totalRecords === "number" &&
    Number.isFinite(params.totalRecords)
      ? Math.max(params.totalRecords, 0)
      : 0;
  const loadedThroughThisPage = skip + itemCount;
  let total = Math.max(reported, loadedThroughThisPage);

  const morePages =
    params.hasNextPage === true ||
    (params.hasNextPage !== false && take > 0 && itemCount >= take);
  if (morePages) {
    total = Math.max(total, skip + take + 2);
  }

  return total;
}
