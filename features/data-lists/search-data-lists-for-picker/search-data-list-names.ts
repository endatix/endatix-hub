import { Result } from "@/lib/result";
import { searchDataListsForPickerAction } from "./search-data-lists-for-picker.action";

export async function searchDataListNamesForPicker(
  query: string,
): Promise<string[]> {
  const result = await searchDataListsForPickerAction({
    search: query,
    page: 1,
    pageSize: 25,
  });
  if (Result.isError(result)) {
    return [];
  }

  return result.value.items.map((item) => item.name);
}
