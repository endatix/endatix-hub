/** Error code a timed-out render reports, both on the thrown error and in `Result`. */
export const PDF_RENDER_TIMEOUT_CODE = "pdf_render_timeout";

/** Operator override, in milliseconds. Read per call so it is never baked at build. */
const DEADLINE_ENV_VAR = "PDF_RENDER_DEADLINE_MS";

/**
 * How long a PDF render may take before the route answers with an error instead.
 *
 * This is a product statement - "an export may take at most this long" - not a
 * reading of any host's request limit. It happens to sit below the 45s cap Azure
 * Static Web Apps applies, which is why a timed-out export shows our own page
 * there rather than the platform's, but nothing here depends on that: on a host
 * with no cap the deadline still bounds the work, and on a host with a shorter
 * one this is what an operator lowers.
 */
export const DEFAULT_RENDER_DEADLINE_MS = 40_000;

/**
 * The deadline in force, honouring `PDF_RENDER_DEADLINE_MS`.
 *
 * A missing, unparseable or non-positive value falls back to the default rather
 * than throwing: a typo in an operator's environment should not take exports
 * down, and there is always a safe number to use.
 */
export function renderDeadlineMs(): number {
  const configured = process.env[DEADLINE_ENV_VAR]?.trim();
  if (!configured) {
    return DEFAULT_RENDER_DEADLINE_MS;
  }

  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RENDER_DEADLINE_MS;
  }

  return parsed;
}

/**
 * Deadline left for the render, measured from when the request started, so time
 * already spent loading the submission is not handed to the renderer twice.
 */
export function remainingDeadlineMs(startedAtMs: number): number {
  return Math.max(0, renderDeadlineMs() - (Date.now() - startedAtMs));
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
    throw new Error(PDF_RENDER_TIMEOUT_CODE);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(PDF_RENDER_TIMEOUT_CODE));
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
  return error instanceof Error && error.message === PDF_RENDER_TIMEOUT_CODE;
}
