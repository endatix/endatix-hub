import { describe, expect, it } from "vitest";
import {
  appendDataListRowsToSurveyCsv,
  extractDataListCsvsFromSurveyRows,
} from "../surveyjs-translation-csv";

describe("surveyjs translation CSV merge", () => {
  it("appends compound-key rows using default then culture columns", () => {
    // Arrange
    const surveyCsv = [
      '"description ↓ - language →",English,es',
      "page1.question1.title,City,Ciudad",
    ].join("\r\n");

    // Act
    const merged = appendDataListRowsToSurveyCsv(surveyCsv, [
      {
        dataListId: "42",
        availableLocales: ["es"],
        items: [
          {
            value: "new_york",
            labels: { default: "New York", es: "Nueva York" },
          },
        ],
      },
    ]);

    // Assert
    expect(merged).toContain("edx_dataList_42_new_york,New York,Nueva York");
    expect(merged).toContain("page1.question1.title,City,Ciudad");
  });

  it("splits compound-key rows into management CSVs and leaves form rows", () => {
    // Arrange
    const rows = [
      ["description ↓ - language →", "English", "es"],
      ["page1.question1.title", "City", "Ciudad"],
      ["edx_dataList_42_new_york", "New York", "Nueva York"],
    ];

    // Act
    const extracted = extractDataListCsvsFromSurveyRows(rows);

    // Assert
    expect(extracted.formRows).toEqual([
      ["description ↓ - language →", "English", "es"],
      ["page1.question1.title", "City", "Ciudad"],
    ]);
    expect(extracted.dataListCsvs).toHaveLength(1);
    expect(extracted.dataListCsvs[0].dataListId).toBe("42");
    expect(extracted.dataListCsvs[0].csv).toContain("value,default,es");
    expect(extracted.dataListCsvs[0].csv).toContain("new_york,New York,Nueva York");
  });
});
