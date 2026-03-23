import { ZodError } from "zod";

// Utility to deeply map properties to string arrays
export type DeepFieldErrors<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object
    ? DeepFieldErrors<NonNullable<T[K]>>
    : string[];
};

export type ActionStateData = Record<string, unknown>;

export interface ParsedZodError<TState = ActionStateData> {
  message: string;
  formErrors: string[];
  fields: DeepFieldErrors<TState>;
}

// Shared properties across all states
interface BaseFormState<TState = ActionStateData> {
  message?: string;
  data?: TState;
}

export interface EmptyFormState<TState = ActionStateData> {
  isSuccess: undefined;
  message?: never;
  data?: TState;
  formErrors?: never;
  errors?: never;
}

export interface SuccessFormState<
  TState = ActionStateData,
> extends BaseFormState<TState> {
  isSuccess: true;
  formErrors?: never;
  errors?: never;
}

export interface ValidationFailedState<
  TState = ActionStateData,
> extends BaseFormState<TState> {
  isSuccess: false;
  formErrors?: string[];
  errors?: DeepFieldErrors<TState>;
}

/**
 * Standard shape for managing action state returns dynamically for better form state management and validation error handling
 */
export type ServerActionState<TState = ActionStateData> =
  | EmptyFormState<TState>
  | SuccessFormState<TState>
  | ValidationFailedState<TState>;

export const ServerActionState = {
  /**
   * Converts a ZodError into a standard ServerActionState, embedding validation
   * messages and preserving the raw form data.
   *
   * @param error The ZodError to convert
   * @param rawData The raw form values to preserve in the state
   * @returns ServerActionState populated with validation errors
   */
  fromZodError: <TState = ActionStateData>(
    error: ZodError,
    rawData?: TState,
  ): ServerActionState<TState> => {
    const parsed = parseZodError<TState>(error);
    return {
      isSuccess: false,
      formErrors: parsed.formErrors.length > 0 ? parsed.formErrors : undefined,
      errors: parsed.fields,
      data: rawData,
    };
  },

  /**
   * Creates an empty form state.
   *
   * @param data The data to include in the state.
   * @returns An empty form state.
   */
  emptyState: <TState = ActionStateData>(
    data?: TState,
  ): EmptyFormState<TState> => ({
    isSuccess: undefined,
    message: undefined,
    data: data,
    formErrors: undefined,
    errors: undefined,
  }),
};

const isUnsafeKey = (key: PropertyKey) =>
  key === "__proto__" || key === "constructor" || key === "prototype";

type MutableNode = Record<PropertyKey, unknown>;

function isObjectNode(value: unknown): value is MutableNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function setFieldError(
  fields: MutableNode,
  path: PropertyKey[],
  message: string,
) {
  if (!path || path.length === 0) return;

  let current: MutableNode = fields;

  // Traverse up to the second-to-last key to build the nested object structure
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    if (isUnsafeKey(key)) return;

    if (!isObjectNode(current[key])) {
      current[key] = {};
    }

    current = current[key] as MutableNode;
  }

  const lastKey = path.at(-1);
  if (lastKey === undefined || isUnsafeKey(lastKey)) return;

  if (!Array.isArray(current[lastKey])) {
    current[lastKey] = [];
  }

  const fieldMessages = current[lastKey];
  if (!Array.isArray(fieldMessages)) return;

  fieldMessages.push(message);
}

/**
 * Normalizes deeply nested validation errors into a flat shape suitable for
 * API `fields: Record<string, string[]>` responses.
 *
 * Example:
 * `{ user: { firstName: ["Too short"] } }` -> `{ "user.firstName": ["Too short"] }`
 */
export function flattenFieldErrors<TState = ActionStateData>(
  fieldErrors?: DeepFieldErrors<TState>, // Made optional to handle undefined gracefully
  rootPrefix: string = "",
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  const flatten = (input: unknown, prefix: string): void => {
    if (!isObjectNode(input)) return;

    for (const [key, value] of Object.entries(input)) {
      if (isUnsafeKey(key)) continue;

      const nextPrefix = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        if (value.every((item) => typeof item === "string")) {
          result[nextPrefix] = value;
        }
        continue;
      }

      if (isObjectNode(value)) {
        flatten(value, nextPrefix);
      }
    }
  };

  flatten(fieldErrors, rootPrefix);
  return result;
}

/**
 * Parses a Zod validation error into a standardized message and fields mapping
 * suitable for `ApiResult.validationError()`.
 *
 * @param error The ZodError to parse.
 * @returns A parsed error object with `message`, `formErrors`, and `fields`.
 */
export function parseZodError<TState = ActionStateData>(
  error: ZodError | null | undefined,
): ParsedZodError<TState> {
  const formErrors: string[] = [];
  const fields: MutableNode = {};

  if (!error || !Array.isArray(error.issues)) {
    return {
      message: "Validation failed",
      formErrors,
      fields: {} as DeepFieldErrors<TState>,
    };
  }

  for (const issue of error.issues) {
    if (!issue.path || issue.path.length === 0) {
      formErrors.push(issue.message);
      continue;
    }

    setFieldError(fields, issue.path, issue.message);
  }

  // Choose a generic error message or use the first form error if available
  const message = formErrors.length > 0 ? formErrors[0] : "Validation failed";

  return {
    message,
    formErrors,
    fields: fields as DeepFieldErrors<TState>,
  };
}
