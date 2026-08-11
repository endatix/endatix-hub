import { DEFAULT_CATALOG_LOCALE } from "@/lib/localization";
import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  discoverLocalesFromKeys,
  isCatalogDefaultLocaleKey,
  normalizeCultureCode,
  normalizeOptionalCultureTag,
  type LocaleDiscoveryOptions,
  type LocaleImportDiscovery,
} from "./locale-discovery";

const VALUE_COLUMN = "value";

/**
 * Lightweight RFC 4180 header/row discovery for translations CSV.
 * Full parse/validation still happens on the API.
 */
export function discoverLocalesFromTranslationsCsv(
  csv: string,
  options: LocaleDiscoveryOptions,
): LocaleImportDiscovery {
  const structuralErrors: string[] = [];

  if (csv.length > DATA_LIST_MAX_CSV_CHARS) {
    return discoverLocalesFromKeys([], options, 0, [
      `CSV exceeds the maximum size of ${DATA_LIST_MAX_CSV_CHARS.toLocaleString()} characters.`,
    ]);
  }

  let records: string[][];
  try {
    records = readCsvRecords(csv);
  } catch (error) {
    return discoverLocalesFromKeys([], options, 0, [
      error instanceof Error ? error.message : "Invalid CSV format.",
    ]);
  }

  if (records.length === 0) {
    return discoverLocalesFromKeys([], options, 0, [
      "The CSV is empty. A header row starting with 'value' is required.",
    ]);
  }

  const header = records[0].map((cell) => cell.trim());
  if (header.length === 0 || header[0].toLowerCase() !== VALUE_COLUMN) {
    structuralErrors.push(`The first CSV column must be '${VALUE_COLUMN}'.`);
  }

  if (header.slice(1).some((column) => column.length === 0)) {
    structuralErrors.push("CSV header columns cannot be empty.");
  }

  const localeColumns = header.slice(1);
  if (
    !localeColumns.some(
      (column) => column.toLowerCase() === DEFAULT_CATALOG_LOCALE,
    ) &&
    !(
      options.defaultLocale &&
      localeColumns.some(
        (column) =>
          column.toLowerCase() === options.defaultLocale!.toLowerCase(),
      )
    )
  ) {
    structuralErrors.push(`A '${DEFAULT_CATALOG_LOCALE}' column is required.`);
  }

  const dataRows = records
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0));

  for (let i = 0; i < dataRows.length; i++) {
    if (dataRows[i].length !== header.length) {
      structuralErrors.push(
        `Row ${i + 2} has ${dataRows[i].length} cells but the header declares ${header.length}.`,
      );
      break;
    }
  }

  if (dataRows.length > DATA_LIST_MAX_ITEMS) {
    structuralErrors.push(
      `A translations CSV cannot have more than ${DATA_LIST_MAX_ITEMS.toLocaleString()} rows.`,
    );
  }

  return discoverLocalesFromKeys(
    localeColumns,
    options,
    dataRows.length,
    structuralErrors,
  );
}

/**
 * Keeps `value` plus selected locale columns (by normalized key). Drops deselected columns.
 */
export function filterTranslationsCsv(
  csv: string,
  includedLocales: string[],
  defaultLocale?: string,
): string {
  const records = readCsvRecords(csv);
  if (records.length === 0) {
    return csv;
  }

  const included = new Set(
    includedLocales.map((locale) => locale.trim().toLowerCase()),
  );
  included.add(DEFAULT_CATALOG_LOCALE);

  const defaultCulture = normalizeOptionalCultureTag(defaultLocale);
  const header = records[0];
  const keepIndexes: number[] = [0];

  for (let i = 1; i < header.length; i++) {
    const raw = header[i].trim();
    let key: string;
    try {
      key = normalizeCultureCode(raw);
    } catch {
      continue;
    }

    if (isCatalogDefaultLocaleKey(key, defaultCulture)) {
      keepIndexes.push(i);
      continue;
    }

    if (included.has(key)) {
      keepIndexes.push(i);
    }
  }

  const lines = records.map((record) =>
    keepIndexes.map((index) => escapeCsvField(record[index] ?? "")).join(","),
  );

  return `${lines.join("\r\n")}\r\n`;
}

export function readCsvRecords(csv: string): string[][] {
  const records: string[][] = [];
  if (!csv) {
    return records;
  }

  const content = csv.replace(/^\uFEFF/, "");
  const state: CsvParseState = {
    fields: [],
    field: "",
    inQuotes: false,
    fieldWasQuoted: false,
  };

  const completeRecord = (): void => {
    const isBlank =
      state.fields.length === 0 &&
      state.field.length === 0 &&
      !state.fieldWasQuoted;
    if (isBlank) {
      return;
    }

    state.fields.push(state.field);
    state.field = "";
    records.push(state.fields);
    state.fields = [];
    state.fieldWasQuoted = false;
  };

  let index = 0;
  while (index < content.length) {
    if (state.inQuotes) {
      index = appendInsideQuotes(state, content, index);
      continue;
    }

    appendOutsideQuotes(state, content[index], completeRecord);
    index++;
  }

  if (state.inQuotes) {
    throw new Error("The CSV ends inside a quoted field.");
  }

  completeRecord();
  return records;
}

type CsvParseState = {
  fields: string[];
  field: string;
  inQuotes: boolean;
  fieldWasQuoted: boolean;
};

/** Handles one character while inside a quoted field; returns the next index. */
function appendInsideQuotes(
  state: CsvParseState,
  content: string,
  index: number,
): number {
  const current = content[index];
  if (current !== '"') {
    state.field += current;
    return index + 1;
  }

  if (index + 1 < content.length && content[index + 1] === '"') {
    state.field += '"';
    return index + 2;
  }

  state.inQuotes = false;
  return index + 1;
}

function appendOutsideQuotes(
  state: CsvParseState,
  current: string,
  completeRecord: () => void,
): void {
  switch (current) {
    case '"':
      if (state.field.length > 0) {
        throw new Error(
          "A quoted CSV field cannot start after unquoted content.",
        );
      }
      state.inQuotes = true;
      state.fieldWasQuoted = true;
      break;
    case ",":
      state.fields.push(state.field);
      state.field = "";
      state.fieldWasQuoted = false;
      break;
    case "\r":
      break;
    case "\n":
      completeRecord();
      break;
    default:
      state.field += current;
      break;
  }
}

function escapeCsvField(field: string): string {
  if (field.length === 0) {
    return field;
  }

  const needsQuotes =
    /[",\r\n]/.test(field) || /\s$/.test(field) || /^\s/.test(field);

  return needsQuotes ? `"${field.replaceAll('"', '""')}"` : field;
}
