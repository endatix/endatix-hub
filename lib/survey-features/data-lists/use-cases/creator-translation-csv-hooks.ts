import {
  appendDataListRowsToSurveyCsv,
  extractDataListCsvsFromSurveyRows,
  type DataListTranslationCatalog,
  type GroupedDataListCsv,
} from "./surveyjs-translation-csv";
import { DATA_LIST_HEADER_GROUP_PREFIX } from "./translation-grid-hydrate";

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
      appendDataListRowsToSurveyCsv(
        stripSyntheticDataListRows(original()),
        options.getCatalogs(),
      ),
    wrapImportFromNestedArray: (original) => (rows) => {
      const cloned = rows.map((row) => [...row]);
      const { formRows, dataListCsvs } =
        extractDataListCsvsFromSurveyRows(cloned);
      original(formRows);
      if (dataListCsvs.length > 0) {
        options.persistCsvs(dataListCsvs);
      }
    },
  };
}

function stripSyntheticDataListRows(csv: string): string {
  const newline = csv.includes("\r\n") ? "\r\n" : "\n";
  return csv
    .split(/\r?\n/)
    .filter((line) => !line.includes(DATA_LIST_HEADER_GROUP_PREFIX))
    .join(newline);
}
