import { describe, expect, it, vi } from "vitest";
import { createDataListTranslationCsvHooks } from "../creator-translation-csv-hooks";

describe("createDataListTranslationCsvHooks", () => {
  it("appends cached catalogs on export and persists compound-key rows on import", () => {
    // Arrange
    const persistCsvs = vi.fn();
    const hooks = createDataListTranslationCsvHooks({
      getCatalogs: () => [
        {
          dataListId: "7",
          availableLocales: [],
          items: [{ value: "a", labels: { default: "Alpha" } }],
        },
      ],
      persistCsvs,
    });
    const exportCsv = hooks.wrapExportToCsv(
      () =>
        '"description ↓ - language →",English\r\npage1.title,Hello\r\nsurvey.page1.questionCities.edxDataList_7.choices,',
    );
    const importRows = hooks.wrapImportFromNestedArray(vi.fn());

    // Act
    const csv = exportCsv();
    importRows([
      ["description ↓ - language →", "English"],
      ["page1.title", "Hello"],
      ["edx_dataList_7_a", "Alpha"],
    ]);

    // Assert
    expect(csv).toContain("edx_dataList_7_a,Alpha");
    expect(csv).not.toContain("edxDataList_");
    expect(persistCsvs).toHaveBeenCalledTimes(1);
    expect(persistCsvs.mock.calls[0][0][0].dataListId).toBe("7");
  });
});
