import {
  appendDataListRowsToSurveyCsv,
  extractDataListCsvsFromSurveyRows,
  type DataListTranslationCatalog,
  type GroupedDataListCsv,
} from "./surveyjs-translation-csv";

export interface DataListTranslationCsvHooks {
  wrapExportToCsv: (original: () => string) => () => string;
  wrapImportFromNestedArray: (
    original: (rows: string[][]) => void,
  ) => (rows: string[][]) => void;
}

export function createDataListTranslationCsvHooks(options: {
  getCatalogs: () => readonly DataListTranslationCatalog[];
  persistCsvs: (csvs: readonly GroupedDataListCsv[]) => void;
}): DataListTranslationCsvHooks {
  return {
    wrapExportToCsv: (original) => () =>
      appendDataListRowsToSurveyCsv(original(), options.getCatalogs()),
    wrapImportFromNestedArray: (original) => (rows) => {
      const cloned = rows.map((row) => [...row]);
      const { formRows, dataListCsvs } = extractDataListCsvsFromSurveyRows(
        cloned,
      );
      original(formRows);
      if (dataListCsvs.length > 0) {
        options.persistCsvs(dataListCsvs);
      }
    },
  };
}
