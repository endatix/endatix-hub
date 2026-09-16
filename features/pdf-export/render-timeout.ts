/** Error code a timed-out render reports, on the thrown error and in `Result`. */
export const PDF_RENDER_TIMEOUT_CODE = "pdf_render_timeout";

/** Operator override, in seconds. Read per call so it is never baked at build. */
const TIMEOUT_ENV_VAR = "PDF_RENDER_TIMEOUT_SECONDS";

const MS_PER_SECOND = 1_000;

/**
 * How long a PDF render may take before the route answers with an error instead.
 *
 * This is a product statement - "an export may take at most this long" - not a
 * reading of any host's request limit. It happens to sit below the 45s cap Azure
 * Static Web Apps applies, which is why a timed-out export shows our own page
 * there rather than the platform's, but nothing here depends on that: on a host
 * with no cap the timeout still bounds the work, and on a host with a shorter
 * one this is what an operator lowers.
 */
export const DEFAULT_RENDER_TIMEOUT_SECONDS = 40;

/**
 * The timeout in force, in milliseconds, honouring `PDF_RENDER_TIMEOUT_SECONDS`.
 *
 * Configured in seconds because operators think in seconds; used in
 * milliseconds because timers do. A missing, unparseable or non-positive value
 * falls back to the default rather than throwing: a typo in an operator's
 * environment should not take exports down.
 */
export function renderTimeoutMs(): number {
  const configured = process.env[TIMEOUT_ENV_VAR]?.trim();
  if (!configured) {
    return DEFAULT_RENDER_TIMEOUT_SECONDS * MS_PER_SECOND;
  }

  const seconds = Number(configured);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_RENDER_TIMEOUT_SECONDS * MS_PER_SECOND;
  }

  return seconds * MS_PER_SECOND;
}

/**
 * Time left for the render, measured from when the request started, so time
 * already spent loading the submission is not handed to the renderer twice.
 */
export function remainingRenderTimeoutMs(startedAtMs: number): number {
  return Math.max(0, renderTimeoutMs() - (Date.now() - startedAtMs));
}

/**
 * Bounds work by a wall-clock timeout. `createWork` runs only when budget remains.
 *
 * This bounds the *response*, not in-flight work: `@react-pdf` exposes no abort,
 * so a render that loses the race keeps going until it finishes.
 */
export async function raceWithTimeout<T>(
  createWork: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new Error(PDF_RENDER_TIMEOUT_CODE);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      createWork(),
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
