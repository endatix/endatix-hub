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
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Parse the data as JSON and return a ProblemDetails object if the data is a valid ProblemDetails.
 * @param data - The data to parse.
 * @returns The ProblemDetails object if the data is a valid ProblemDetails, otherwise null.
 */
export function parseProblemDetails(data: unknown): ProblemDetails | null {
  const result = ProblemDetailsSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Parse the response body as JSON and return a ProblemDetails object if the response is a valid ProblemDetails.
 * @param response - The response to parse.
 * @returns The ProblemDetails object if the response is a valid ProblemDetails, otherwise null.
 */
export async function parseErrorResponse(
  response: Response,
): Promise<ProblemDetails | null> {
  const data = await response.json();
  return parseProblemDetails(data);
}
