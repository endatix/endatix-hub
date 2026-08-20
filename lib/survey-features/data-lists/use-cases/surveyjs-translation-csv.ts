import { tryNormalizeCultureCode } from "@/lib/localization";
import {
  encodeDataListTranslationKey,
  parseDataListTranslationKey,
} from "./data-list-translation-key";

export interface DataListTranslationCatalog {
  dataListId: string;
  name?: string;
  itemsCount?: number;
  defaultLocale?: string;
  availableLocales: string[];
  items: Array<{
    value: string;
    labels: Record<string, string>;
  }>;
}

export interface GroupedDataListCsv {
  dataListId: string;
  csv: string;
}

const DEFAULT_LABEL_KEY = "default";

function escapeCsvField(field: string): string {
  if (field.length === 0) {
    return field;
  }

  const needsQuotes =
    /[",\r\n]/.test(field) || /\s$/.test(field) || /^\s/.test(field);
  return needsQuotes ? `"${field.replaceAll('"', '""')}"` : field;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export function appendDataListRowsToSurveyCsv(
  surveyCsv: string,
  catalogs: readonly DataListTranslationCatalog[],
): string {
  if (catalogs.length === 0 || surveyCsv.trim().length === 0) {
    return surveyCsv;
  }

  const headerLine = surveyCsv.replace(/^\uFEFF/, "").split(/\r?\n/)[0];
  if (!headerLine) {
    return surveyCsv;
  }

  const localeHeaders = splitCsvLine(headerLine).slice(1);
  const extraRows = catalogs.flatMap((catalog) =>
    catalog.items.map((item) => {
      const row = [
        encodeDataListTranslationKey(catalog.dataListId, item.value),
      ];
      localeHeaders.forEach((localeHeader, index) => {
        row.push(
          resolveLabelForSurveyHeader(item.labels, localeHeader, index === 0),
        );
      });
      return row.map(escapeCsvField).join(",");
    }),
  );

  if (extraRows.length === 0) {
    return surveyCsv;
  }

  const trimmed = surveyCsv.replace(/(\r?\n)+$/, "");
  return `${trimmed}\r\n${extraRows.join("\r\n")}`;
}

export function extractDataListCsvsFromSurveyRows(rows: string[][]): {
  formRows: string[][];
  dataListCsvs: GroupedDataListCsv[];
} {
  if (rows.length === 0) {
    return { formRows: [], dataListCsvs: [] };
  }

  const header = [...rows[0]];
  const localeHeaders = header.slice(1);
  const cultureColumns = localeHeaders.slice(1).flatMap((localeHeader) => {
    const culture = tryNormalizeCultureCode(localeHeader);
    return culture ? [culture] : [];
  });
  const formRows: string[][] = [header];
  const grouped = new Map<string, string[][]>();

  for (const row of rows.slice(1)) {
    const parsed = parseDataListTranslationKey(row[0]?.trim() ?? "");
    if (!parsed) {
      formRows.push(row);
      continue;
    }

    const existing = grouped.get(parsed.dataListId) ?? [
      ["value", DEFAULT_LABEL_KEY, ...cultureColumns],
    ];
    const labelsByCulture = localeHeaders
      .slice(1)
      .map((localeHeader, index) => ({
        locale: tryNormalizeCultureCode(localeHeader),
        text: row[index + 2] ?? "",
      }));
    existing.push([
      parsed.value,
      row[1] ?? "",
      ...cultureColumns.map((culture) => {
        const match = labelsByCulture.find((entry) => entry.locale === culture);
        return match?.text ?? "";
      }),
    ]);
    grouped.set(parsed.dataListId, existing);
  }

  return {
    formRows,
    dataListCsvs: [...grouped.entries()].map(([dataListId, csvRows]) => ({
      dataListId,
      csv: toCsv(csvRows),
    })),
  };
}

function resolveLabelForSurveyHeader(
  labels: Record<string, string>,
  localeHeader: string,
  isFirstLocaleColumn: boolean,
): string {
  if (isFirstLocaleColumn) {
    return labels[DEFAULT_LABEL_KEY] ?? "";
  }

  const culture = tryNormalizeCultureCode(localeHeader);
  if (!culture) {
    return "";
  }

  return labels[culture] ?? "";
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (inQuotes) {
      if (current === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }
      if (current === '"') {
        inQuotes = false;
        continue;
      }
      field += current;
      continue;
    }

    if (current === '"') {
      inQuotes = true;
      continue;
    }
    if (current === ",") {
      fields.push(field);
      field = "";
      continue;
    }
    field += current;
  }

  fields.push(field);
  return fields;
}
