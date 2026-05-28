import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PrivateReadUrlBatchQueue,
  READ_URL_FLUSH_DEBOUNCE_MS,
} from "@/features/asset-storage/application/read-url-queue";

describe("PrivateReadUrlBatchQueue", () => {
  let cache: Record<string, string>;
  let fetchBatch: ReturnType<typeof vi.fn>;
  let onBatchResolved: ReturnType<typeof vi.fn>;
  let queue: PrivateReadUrlBatchQueue;

  const runtime = { formId: "1503838931194478592" };

  beforeEach(() => {
    vi.useFakeTimers();
    cache = {};
    fetchBatch = vi.fn();
    onBatchResolved = vi.fn((entries: Record<string, string>) => {
      Object.assign(cache, entries);
    });
    queue = new PrivateReadUrlBatchQueue({
      getCache: () => cache,
      fetchBatch,
      onBatchResolved,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function flushDebounce(): Promise<void> {
    await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
  }

  it("batches multiple enqueues within debounce into one fetch", async () => {
    const urlA = "http://localhost:9000/content-vault/f/1/a.svg";
    const urlB = "http://localhost:9000/content-vault/f/1/b.jpg";
    const urlC = "http://localhost:9000/content-vault/f/1/c.png";

    fetchBatch.mockResolvedValue({
      resolved: {
        [urlA]: { url: `${urlA}?sig=1` },
        [urlB]: { url: `${urlB}?sig=1` },
        [urlC]: { url: `${urlC}?sig=1` },
      },
    });

    const p1 = queue.enqueue([urlA], runtime);
    const p2 = queue.enqueue([urlB], runtime);
    const p3 = queue.enqueue([urlC], runtime);

    await flushDebounce();
    await Promise.all([p1, p2, p3]);

    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(fetchBatch.mock.calls[0][0]).toEqual(
      expect.arrayContaining([urlA, urlB, urlC]),
    );
    expect(fetchBatch.mock.calls[0][0]).toHaveLength(3);
  });

  it("dedupes concurrent enqueue for the same raw URL", async () => {
    const raw = "http://localhost:9000/content-vault/f/1/a.jpg";
    const presigned = `${raw}?sig=1`;

    fetchBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ resolved: { [raw]: { url: presigned } } }),
            10,
          );
        }),
    );

    const first = queue.enqueue([raw], runtime);
    const second = queue.enqueue([raw], runtime);

    await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
    await vi.advanceTimersByTimeAsync(10);

    const [mapA, mapB] = await Promise.all([first, second]);

    expect(mapA.get(raw)).toBe(presigned);
    expect(mapB.get(raw)).toBe(presigned);
    expect(fetchBatch).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when URL is already in cache", async () => {
    const raw = "http://localhost:9000/content-vault/f/1/cached.png";
    cache[raw] = `${raw}?sig=cached`;

    const result = await queue.enqueue([raw], runtime);

    expect(fetchBatch).not.toHaveBeenCalled();
    expect(result.get(raw)).toBe(cache[raw]);
  });

  it("flushes immediately when pending reaches batch size limit", async () => {
    const urls = Array.from(
      { length: 50 },
      (_, i) => `http://localhost:9000/content-vault/f/1/file-${i}.png`,
    );
    const resolved: Record<string, { url: string }> = {};
    for (const url of urls) {
      resolved[url] = { url: `${url}?sig=1` };
    }
    fetchBatch.mockResolvedValue({ resolved });

    const pending = queue.enqueue(urls, runtime);
    await pending;

    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(fetchBatch.mock.calls[0][0]).toHaveLength(50);
  });
});
