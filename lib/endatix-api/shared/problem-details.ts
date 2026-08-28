import { z } from "zod";

/**
 * The schema for a ProblemDetails object. More information about the ProblemDetails object can be found here: https://datatracker.ietf.org/doc/html/rfc7807
 *
 * `type` and `title` are optional so partial payloads (e.g. streaming endpoints that only set
 * `detail` + `status`) still surface a useful message instead of falling back to a generic one.
 *
 * Endatix API (0.7.5+) emits one RFC7807 shape for handler errors, FluentValidation, and
 * unhandled exceptions — `fields` is a property→messages dictionary (not FE `{statusCode, message, errors}`).
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number(),
  // RFC7807 makes `detail` optional. Endatix always sends it, but ASP.NET's built-in
  // writers (401/404 from auth and routing) omit it - accept those instead of failing
  // the parse and falling back to a generic message.
  detail: z.string().optional(),
  instance: z.string().optional(),
  errorCode: z.string().optional(),
  traceId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Parsed problem details. `detail` is normalized to always be present (falling back to
 * `title`), so callers never have to branch on a missing message.
 */
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema> & {
  detail: string;
};

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
  const instance = record.instance ?? record.Instance;
  const errorCode = record.errorCode ?? record.ErrorCode;
  const traceId = record.traceId ?? record.TraceId;
  const fields = record.fields ?? record.Fields;

  return {
    ...record,
    ...(typeof detail === "string" ? { detail } : {}),
    ...(typeof status === "number" ? { status } : {}),
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof type === "string" ? { type } : {}),
    ...(typeof instance === "string" ? { instance } : {}),
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
    const title = result.data.title ?? "Error";
    return {
      type: result.data.type ?? "about:blank",
      title,
      status: result.data.status,
      // Keep `detail` a guaranteed string for consumers; fall back to the title when the
      // producer omitted it.
      detail: result.data.detail ?? title,
      instance: result.data.instance,
      errorCode: result.data.errorCode,
      traceId: result.data.traceId,
      fields: result.data.fields,
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
