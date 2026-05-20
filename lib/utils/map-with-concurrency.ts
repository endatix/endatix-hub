/** Maps async work over items with a bounded concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be at least 1");
  }

  const results: R[] = new Array(items.length);
  let index = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const current = index;
      index += 1;

      if (current >= items.length) {
        return;
      }

      results[current] = await worker(items[current]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.floor(concurrency), items.length) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return results;
}
