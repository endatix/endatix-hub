import { z } from "zod";

/**
 * The schema for a ProblemDetails object. More information about the ProblemDetails object can be found here: https://datatracker.ietf.org/doc/html/rfc7807
 */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
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
 * Parse the data as JSON and return a ProblemDetails object if the data is a valid ProblemDetails.
 * @param data - The data to parse.
 * @returns The ProblemDetails object if the data is a valid ProblemDetails, otherwise null.
 */
export function parseProblemDetails(data: unknown): ProblemDetails | null {
  const result = ProblemDetailsSchema.safeParse(data);

  if (result.success) {
    return result.data;
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
 * @param response - The response to parse.
 * @returns The ProblemDetails object if the response is a valid ProblemDetails, otherwise null.
 */
export async function parseErrorResponse(
  response: Response,
): Promise<ProblemDetails | null> {
  try {
    const data = await response.json();
    return parseProblemDetails(data);
  } catch (error) {
    console.error("Error parsing error response:", error);
    return null;
  }
}