const PDF_RENDER_TIMEOUT = "pdf_render_timeout";

/**
 * How long a PDF render may take before the route answers with an error instead.
 *
 * This is a product statement - "an export may take at most this long" - not a
 * reading of any host's request limit. It happens to sit below the 45s cap Azure
 * Static Web Apps applies, which is why a timed-out export shows our own page
 * there rather than the platform's, but nothing here depends on that: on a host
 * with no cap the deadline still bounds the work, and on a host with a shorter
 * one this value is what an operator lowers.
 */
export const RENDER_DEADLINE_MS = 40_000;

/**
 * Deadline left for the render, measured from when the request started, so time
 * already spent loading the submission is not handed to the renderer twice.
 */
export function remainingDeadlineMs(startedAtMs: number): number {
  return Math.max(0, RENDER_DEADLINE_MS - (Date.now() - startedAtMs));
}

/**
 * Bounds `work` by a wall-clock deadline.
 *
 * Note this is a *response* deadline, not cancellation: `@react-pdf` exposes no
 * abort, so a render that loses the race keeps going until it finishes. The
 * caller stops waiting; the work does not stop.
 */
export async function raceWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new Error(PDF_RENDER_TIMEOUT);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(PDF_RENDER_TIMEOUT));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function isPdfRenderTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === PDF_RENDER_TIMEOUT;
}
