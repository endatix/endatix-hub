import { z } from "zod";
import { Result } from "../result";

// C# long.MaxValue - use string to avoid precision loss
const NET_LONG_MAX_VALUE = BigInt("9223372036854775807");
const NUMERIC_STRING_PATTERN = /^\d+$/;
const HEX_STRING_PATTERN = /^[0-9A-Fa-f]+$/;

/**
 * True when `value` is non-empty and contains only ASCII decimal digits (0-9).
 * Rejects hex (`0x10`), scientific (`1e2`), signs, decimals, and other `Number()` coercions.
 */
export function isDecimalDigitString(value: string): boolean {
  return NUMERIC_STRING_PATTERN.test(value);
}

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

  if (!isDecimalDigitString(id)) {
    return Result.validationError(
      `${paramName} must be a numeric string containing only digits (0-9)`,
    );
  }

  try {
    const bigintId = BigInt(id);

    if (bigintId <= 0) {
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

export function createEndatixIdSchema(paramName: string) {
  return z
    .string()
    .trim()
    .superRefine((id, ctx) => {
      const result = validateEndatixId(id, paramName);

      if (Result.isError(result)) {
        ctx.addIssue({
          code: "custom",
          message: result.message,
        });
      }
    });
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

/**
 * Checks if an object has a property.
 * @param obj - The object to check.
 * @param prop - The property to check.
 * @returns true if the object has the property, false otherwise.
 * @example
 * hasProperty({ name: "John", age: 30 }, "name"); // true
 * hasProperty({ name: "John", age: 30 }, "address"); // false
 */
export function hasProperty<X extends object, Y extends PropertyKey>(
  obj: X,
  prop: Y,
): obj is X & Record<Y, any> {
  // Use the 'in' operator to check the prototype chain where SurveyJS getters live
  return obj !== null && typeof obj === "object" && prop in obj;
}
