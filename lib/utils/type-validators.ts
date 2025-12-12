import { Result } from "../result";

// C# long.MaxValue
const NET_LONG_MAX_VALUE = BigInt(9223372036854775807);
const NUMERIC_STRING_PATTERN = /^\d+$/;
const HEX_STRING_PATTERN = /^[0-9A-Fa-f]+$/;

/**
 * Validates that the given id is a valid Endatix ID (long) value.
 * @param id - The id to validate.
 * @param paramName - The name of the parameter to validate.
 * @returns A result containing the validated id string or an error.
 */
export function validateEndatixId(
  id: string,
  paramName: string,
): Result<string> {
  if (!id) {
    return Result.validationError(`${paramName} is required`);
  }

  if (typeof id !== "string") {
    return Result.validationError(`${paramName} must be a string`);
  }

  if (!NUMERIC_STRING_PATTERN.test(id)) {
    return Result.validationError(
      `${paramName} must be a numeric string containing only digits (0-9)`,
    );
  }

  try {
    const bigintId = BigInt(id);

    if (bigintId < 0) {
      return Result.validationError(`${paramName} must be greater than 0`);
    }

    if (bigintId > NET_LONG_MAX_VALUE) {
      return Result.validationError(
        `${paramName} must be less than ${NET_LONG_MAX_VALUE}`,
      );
    }

    return Result.success(id);
  } catch {
    return Result.validationError(`${paramName} is not a valid numeric value`);
  }
}

/**
 * Validates a hexadecimal string token (e.g., for submission tokens).
 * Prevents SSRF by ensuring the token is a valid hex string without path traversal characters.
 * @param value - The token string to validate.
 * @param paramName - The name of the parameter to validate.
 * @param expectedLength - Optional expected length (e.g., 64 for 32-byte tokens). If not provided, any length is accepted.
 * @returns A result containing the validated string or an error.
 */
export function validateHexToken(
  value: string,
  paramName: string,
  expectedLength?: number,
): Result<string> {
  if (!value) {
    return Result.validationError(`${paramName} is required`);
  }

  if (typeof value !== "string") {
    return Result.validationError(`${paramName} must be a string`);
  }

  // Block path separators and parent directory references
  if (value.includes("/") || value.includes("\\") || value.includes("..")) {
    return Result.validationError(
      `${paramName} must not contain path separators or parent directory references`,
    );
  }

  // Block URL-encoded dangerous characters
  if (
    value.includes("%2F") ||
    value.includes("%5C") ||
    value.includes("%2E%2E")
  ) {
    return Result.validationError(
      `${paramName} must not contain URL-encoded path traversal characters`,
    );
  }

  if (!HEX_STRING_PATTERN.test(value)) {
    return Result.validationError(
      `${paramName} must be a valid hexadecimal string`,
    );
  }

  // Validate length if specified (e.g., 64 for 32-byte tokens)
  if (expectedLength !== undefined && value.length !== expectedLength) {
    return Result.validationError(
      `${paramName} must be exactly ${expectedLength} characters`,
    );
  }

  return Result.success(value);
}
