export interface ProblemDetailsPayload {
  title?: string;
  detail?: string;
  status?: number;
  errorCode?: string;
  fields?: Record<string, string[]>;
}

export async function tryParseProblemDetails(
  response: Response,
): Promise<ProblemDetailsPayload | null> {
  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    return (await response.json()) as ProblemDetailsPayload;
  } catch {
    return null;
  }
}
