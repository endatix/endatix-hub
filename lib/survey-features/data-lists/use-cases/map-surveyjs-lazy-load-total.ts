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
    params.hasNextPage === true || (take > 0 && itemCount >= take);
  if (morePages) {
    // Need total > skip+take+1 after SurveyJS increments skip by take.
    total = Math.max(total, skip + take + 2);
  }

  return total;
}
