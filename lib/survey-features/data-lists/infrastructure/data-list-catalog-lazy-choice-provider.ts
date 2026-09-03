import { searchDataListsForPickerAction } from "@/features/data-lists/search-data-lists-for-picker";
import { getDataListDetailsAction } from "@/features/data-lists/view-list-details/get-data-list-details.action";
import { Result } from "@/lib/result";
import { DATA_LIST_PROPERTY_NAME } from "../constants";
import type { PropertyGridLazyChoiceProvider } from "../types";
import { mapSkipTakeToPage } from "../use-cases/map-skip-take-to-page";
import { registerPropertyGridLazyChoiceProvider } from "./property-grid-lazy-choice-registry";

export const dataListCatalogLazyChoiceProvider: PropertyGridLazyChoiceProvider =
  {
    propertyName: DATA_LIST_PROPERTY_NAME,
    shouldEnable: () => true,
    getStaticChoices: () => [],
    loadPage: async (_ctx, params) => {
      const { page, pageSize } = mapSkipTakeToPage(params.skip, params.take);
      const search = params.filter?.trim();
      const result = await searchDataListsForPickerAction({
        page,
        pageSize,
        search: search && search.length > 0 ? search : undefined,
      });

      if (Result.isError(result)) {
        return { items: [], total: 0 };
      }

      return {
        items: result.value.items.map((item) => ({
          value: String(item.id),
          text: item.name,
        })),
        total: result.value.totalRecords,
      };
    },
    resolveDisplayValues: async (_ctx, values) => {
      const labels = await Promise.all(
        values.map(async (value) => {
          const response = await getDataListDetailsAction(value);
          if (Result.isError(response)) {
            return value;
          }

          return response.value.name || value;
        }),
      );

      return labels;
    },
  };

export function registerDataListCatalogLazyChoiceProvider(): void {
  registerPropertyGridLazyChoiceProvider(dataListCatalogLazyChoiceProvider);
}
