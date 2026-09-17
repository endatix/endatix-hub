import { parseScalarString } from "./type-parsers";

/**
 * Removes trailing LF / CRLF sequences without a backtracking regex.
 */
export function stripTrailingNewlines(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "\n") {
    end -= 1;
    if (end > 0 && value[end - 1] === "\r") {
      end -= 1;
    }
  }

  return value.slice(0, end);
}

export type StringifyErrorBehavior = "message" | "emptyString" | "toString";

export type StringifyUnknownOptions = {
  /** If this key is a scalar (or `null`), use it instead of JSON. */
  preferKey?: string;
  /** Replacement for `null`. Default `"null"`. Pass `""` for empty. */
  nullBehavior?: string;
  /** Replacement for `undefined`. Default `"undefined"`. */
  undefinedBehavior?: string;
  /** How to render `Error`. Default `"message"`. */
  errorBehavior?: StringifyErrorBehavior;
  /** Replacement when `JSON.stringify` throws (cycles). Default `"[Circular]"`. */
  circularBehavior?: string;
};

const DEFAULTS = {
  nullBehavior: "null",
  undefinedBehavior: "undefined",
  errorBehavior: "message" as StringifyErrorBehavior,
  circularBehavior: "[Circular]",
};

/**
 * String form of an unknown value without `String(object)` → `[object Object]`.
 */
export function stringifyUnknown(
  value: unknown,
  options: StringifyUnknownOptions = {},
): string {
  const nullBehavior = options.nullBehavior ?? DEFAULTS.nullBehavior;
  const undefinedBehavior =
    options.undefinedBehavior ?? DEFAULTS.undefinedBehavior;
  const errorBehavior = options.errorBehavior ?? DEFAULTS.errorBehavior;
  const circularBehavior =
    options.circularBehavior ?? DEFAULTS.circularBehavior;

  if (value === null) return nullBehavior;
  if (value === undefined) return undefinedBehavior;
  if (value instanceof Error) {
    return stringifyError(value, errorBehavior);
  }

  const scalar = parseScalarString(value);
  if (scalar !== null) {
    return scalar;
  }

  if (typeof value === "object") {
    const preferred = preferredScalar(value, options.preferKey, nullBehavior);
    if (preferred !== undefined) {
      return preferred;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return circularBehavior;
    }
  }

  return typeof value === "symbol" || typeof value === "function"
    ? value.toString()
    : "unknown";
}

function stringifyError(error: Error, behavior: StringifyErrorBehavior): string {
  switch (behavior) {
    case "emptyString":
      return "";
    case "toString":
      return error.toString();
    default:
      return error.message;
  }
}

function preferredScalar(
  value: object,
  key: string | undefined,
  nullBehavior: string,
): string | undefined {
  if (!key || !(key in value)) {
    return undefined;
  }

  const preferred = (value as Record<string, unknown>)[key];
  if (preferred === null) {
    return nullBehavior;
  }

  return parseScalarString(preferred) ?? undefined;
}
