import { MAX_SUBMISSION_GRID_ROW_COLUMNS } from "./submission-grid-types";

/**
 * Bytes the encoded `columns=` value may take. The API refuses a request
 * line over 8,192 bytes (Kestrel's default `MaxRequestLineSize`); the path,
 * paging, sort and filters need the rest. 500 descriptive question names
 * pass the key cap but not this one.
 */
export const MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES = 6_144;

const ENCODED_COMMA_BYTES = 3;

/** How much of the rows request's column limits `keys` already use. */
export type RowColumnsUsage = { count: number; bytes: number };

export function rowColumnsUsage(keys: readonly string[]): RowColumnsUsage {
  return keys.reduce(addRowColumn, { count: 0, bytes: 0 });
}

/** Whether `key` still fits after the keys `usage` counts. */
export function fitsRowColumns(usage: RowColumnsUsage, key: string): boolean {
  const next = addRowColumn(usage, key);
  return (
    next.count <= MAX_SUBMISSION_GRID_ROW_COLUMNS &&
    next.bytes <= MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES
  );
}

/** The longest prefix of `keys` the rows endpoint accepts. */
export function fitRowColumns(keys: readonly string[]): string[] {
  let usage: RowColumnsUsage = { count: 0, bytes: 0 };
  const fitted: string[] = [];
  for (const key of keys) {
    if (!fitsRowColumns(usage, key)) break;
    usage = addRowColumn(usage, key);
    fitted.push(key);
  }
  return fitted;
}

/** Each key costs its form-encoded length; each comma between keys `%2C`. */
function addRowColumn(usage: RowColumnsUsage, key: string): RowColumnsUsage {
  const separator = usage.count > 0 ? ENCODED_COMMA_BYTES : 0;
  return {
    count: usage.count + 1,
    bytes: usage.bytes + separator + encodedLength(key),
  };
}

function encodedLength(value: string): number {
  return new URLSearchParams({ v: value }).toString().length - "v=".length;
}
