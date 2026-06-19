import type { UrlSearchParamsUpdater } from "./hooks/use-url-search-params-updater.hook";

/**
 * Creates a function that updates the URL search params with the given param key and value.
 * @param updateUrl - The function to update the URL search params.
 * @param paramKey - The key of the param to update.
 * @param allValue - The value to use for the all value.
 * @returns A function that updates the URL search params with the given param key and value.
 */
export function createUrlFilterUpdater(
  updateUrl: UrlSearchParamsUpdater,
  paramKey: string,
  allValue: string,
) {
  return (value: string) => {
    updateUrl({
      [paramKey]: value === allValue ? null : value,
      page: "1",
    });
  };
}
