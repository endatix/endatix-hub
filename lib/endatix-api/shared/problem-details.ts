import { z } from "zod";

/**
 * The schema for a ProblemDetails object. More information about the ProblemDetails object can be found here: https://datatracker.ietf.org/doc/html/rfc7807
 *
 * `type` and `title` are optional so partial payloads (e.g. streaming endpoints that only set
 * `detail` + `status`) still surface a useful message instead of falling back to a generic one.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number(),
  detail: z.string(),
  errorCode: z.string().optional(),
  traceId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * The schema for a ValidationProblemDetails object returned from the API.
 * TODO: Merge this with ProblemDetailsSchema once Endatix API fully moves to problem details
 */
export const ValidationProblemDetailsSchema = z.object({
  statusCode: z.number().int().min(400).max(499),
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Normalize common ProblemDetails shapes (camelCase RFC7807 and PascalCase .NET defaults).
 */
function normalizeProblemDetailsCandidate(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }

  const record = data as Record<string, unknown>;
  const detail = record.detail ?? record.Detail;
  const status = record.status ?? record.Status;
  const title = record.title ?? record.Title;
  const type = record.type ?? record.Type;
  const errorCode = record.errorCode ?? record.ErrorCode;
  const traceId = record.traceId ?? record.TraceId;
  const fields =
    record.fields ?? record.Fields ?? record.errors ?? record.Errors;

  return {
    ...record,
    ...(typeof detail === "string" ? { detail } : {}),
    ...(typeof status === "number" ? { status } : {}),
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof type === "string" ? { type } : {}),
    ...(typeof errorCode === "string" ? { errorCode } : {}),
    ...(typeof traceId === "string" ? { traceId } : {}),
    ...(fields !== undefined ? { fields } : {}),
  };
}

/**
 * Parse the data as JSON and return a ProblemDetails object if the data is a valid ProblemDetails.
 * @param data - The data to parse.
 * @returns The ProblemDetails object if the data is a valid ProblemDetails, otherwise null.
 */
export function parseProblemDetails(data: unknown): ProblemDetails | null {
  const normalized = normalizeProblemDetailsCandidate(data);
  const result = ProblemDetailsSchema.safeParse(normalized);

  if (result.success) {
    return {
      type: result.data.type ?? "about:blank",
      title: result.data.title ?? "Error",
      status: result.data.status,
      detail: result.data.detail,
      errorCode: result.data.errorCode,
      traceId: result.data.traceId,
      fields: result.data.fields,
    };
  }

  const validationResult = ValidationProblemDetailsSchema.safeParse(data);

  if (validationResult.success) {
    return {
      type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
      title: "One or more validation errors occurred.",
      status: validationResult.data.statusCode,
      detail: validationResult.data.message,
      fields: validationResult.data.errors,
    };
  }

  return null;
}

/**
 * Parse the response body as JSON and return a ProblemDetails object if the response is a valid ProblemDetails.
 * Uses `text()` first to avoid throwing on empty 404s and other minimal responses.
 * @param response - The response to parse.
 * @returns The ProblemDetails object if the response is a valid ProblemDetails, otherwise null.
 */
export async function parseErrorResponse(
  response: Response,
): Promise<ProblemDetails | null> {
  const raw = await response.text();
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(trimmed);
    return parseProblemDetails(data);
  } catch (error) {
    console.warn(
      "Error response body was not valid JSON or problem details:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
