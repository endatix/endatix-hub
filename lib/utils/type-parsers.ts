import { Result } from "../result";

/**
 * Tries to parse a JSON string into a value of type T
 * @param value - The string value to parse, can be undefined
 * @returns Result.success(value) if parsing is successful, Result.error(error) otherwise
 */
function tryParseJson<T>(value: string | undefined): Result<T> {
  if (!value) {
    return Result.error("Value is required");
  }
  try {
    return Result.success(JSON.parse(value));
  } catch (ex) {
    return Result.error(`Error parsing JSON: ${ex}`);
  }
}

/**
 * Parses a string value into a boolean
 * Intended to be used for parsing environment variables & query parameters
 * @param value - The string value to parse, can be undefined
 * @returns true if value is 'true' or '1' (case-insensitive), false otherwise
 */
function parseBoolean(value: string | undefined): boolean {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return false;
  }

  const normalizedValue = trimmedValue.toLowerCase();
  return normalizedValue === "true" || normalizedValue === "1";
}

export { parseBoolean, tryParseJson };
