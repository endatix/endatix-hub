import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../map-with-concurrency";

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("mapWithConcurrency", () => {
  it("preserves input order", async () => {
    const result = await mapWithConcurrency([3, 1, 2], 2, async (item) => {
      return item * 10;
    });

    expect(result).toEqual([30, 10, 20]);
  });

  it("runs at most the requested number of workers concurrently", async () => {
    const blockers = [deferred(), deferred(), deferred(), deferred()];
    let activeWorkers = 0;
    let maxActiveWorkers = 0;

    const promise = mapWithConcurrency([0, 1, 2, 3], 2, async (item) => {
      activeWorkers += 1;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
      await blockers[item]!.promise;
      activeWorkers -= 1;
      return item;
    });

    await Promise.resolve();
    expect(maxActiveWorkers).toBe(2);

    blockers[0]!.resolve(undefined);
    await Promise.resolve();
    expect(maxActiveWorkers).toBe(2);

    blockers[1]!.resolve(undefined);
    blockers[2]!.resolve(undefined);
    blockers[3]!.resolve(undefined);

    await expect(promise).resolves.toEqual([0, 1, 2, 3]);
    expect(maxActiveWorkers).toBe(2);
  });

  it("returns an empty array for empty input", async () => {
    const result = await mapWithConcurrency([], 3, async () => "unused");

    expect(result).toEqual([]);
  });

  it("throws when concurrency is less than one", async () => {
    await expect(
      mapWithConcurrency([1], 0, async (item) => item),
    ).rejects.toThrow(new RangeError("Concurrency must be at least 1"));
  });

  it("rejects when a worker rejects", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error("worker failed");
        }

        return item;
      }),
    ).rejects.toThrow("worker failed");
  });
});
