const PDF_RENDER_TIMEOUT = "pdf_render_timeout";

export const SWA_SSR_BUDGET_MS = 40_000;

export function remainingSwaBudgetMs(startedAtMs: number): number {
  return Math.max(0, SWA_SSR_BUDGET_MS - (Date.now() - startedAtMs));
}

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
