import type { StorageReadRuntime } from "../../infrastructure/fetch-storage-read-urls";
import type { ReadUrlsResponse } from "../../use-cases/resolve-read-urls/resolve-read-urls";

/** Matches Hub gate limit in form-access/parse/parse-read-urls-body.ts */
export const MAX_READ_URL_BATCH_SIZE = 50;

export const READ_URL_FLUSH_DEBOUNCE_MS = 20;
export const READ_URL_FLUSH_MAX_WAIT_MS = 100;

export type FetchReadUrlBatch = (
  urls: string[],
  runtime: StorageReadRuntime | null,
) => Promise<ReadUrlsResponse | null>;

export interface PrivateReadUrlBatchQueueDeps {
  getCache: () => Record<string, string>;
  fetchBatch: FetchReadUrlBatch;
  onBatchResolved: (entries: Record<string, string>) => void;
}

interface BucketState {
  runtime: StorageReadRuntime | null;
  pending: Set<string>;
  resolversByUrl: Map<string, (value: string | null) => void>;
  promiseByUrl: Map<string, Promise<string | null>>;
}

function runtimeBucketKey(runtime: StorageReadRuntime | null): string {
  if (runtime === null) {
    return "__null__";
  }
  return `${runtime.policyName}|${runtime.formId ?? ""}|${runtime.templateId ?? ""}|${runtime.submissionId ?? ""}|${runtime.token ?? ""}|${runtime.tokenType ?? ""}`;
}

/**
 * Batches private storage read-url requests (debounced) with per-URL promise dedupe.
 * Mirrors {@link SubmissionQueue} structure; owned by AssetStorageClientProvider via useRef.
 */
export class PrivateReadUrlBatchQueue {
  private readonly buckets = new Map<string, BucketState>();

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;

  private firstEnqueueAt: number | null = null;

  private isFlushing = false;

  constructor(private readonly deps: PrivateReadUrlBatchQueueDeps) {}

  /** Seeds resolved URLs (e.g. tests or server-provided manifest). */
  seedCache(entries: Record<string, string>): void {
    const resolved: Record<string, string> = {};
    for (const [rawUrl, presigned] of Object.entries(entries)) {
      if (presigned.length > 0) {
        resolved[rawUrl] = presigned;
      }
    }
    if (Object.keys(resolved).length > 0) {
      this.deps.onBatchResolved(resolved);
    }
  }

  async enqueue(
    urls: string[],
    runtime: StorageReadRuntime | null,
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(urls.filter((u) => u.length > 0))];
    const results = new Map<string, Promise<string | null>>();

    for (const url of unique) {
      results.set(url, this.resolveOne(url, runtime));
    }

    const settled = await Promise.all(
      [...results.entries()].map(async ([url, promise]) => {
        return [url, await promise] as const;
      }),
    );

    return new Map(settled);
  }

  private resolveOne(
    url: string,
    runtime: StorageReadRuntime | null,
  ): Promise<string | null> {
    const cached = this.deps.getCache()[url];
    if (cached !== undefined && cached.length > 0) {
      return Promise.resolve(cached);
    }

    const bucketKey = runtimeBucketKey(runtime);
    let bucket = this.buckets.get(bucketKey);
    if (bucket === undefined) {
      bucket = {
        runtime,
        pending: new Set(),
        resolversByUrl: new Map(),
        promiseByUrl: new Map(),
      };
      this.buckets.set(bucketKey, bucket);
    }

    const existing = bucket.promiseByUrl.get(url);
    if (existing !== undefined) {
      return existing;
    }

    const promise = new Promise<string | null>((resolve) => {
      bucket!.resolversByUrl.set(url, resolve);
    });
    bucket.promiseByUrl.set(url, promise);
    bucket.pending.add(url);

    this.scheduleFlush();

    return promise;
  }

  private scheduleFlush(): void {
    if (this.isFlushing) {
      return;
    }

    if (this.totalPendingCount() >= MAX_READ_URL_BATCH_SIZE) {
      void this.flush();
      return;
    }

    if (this.firstEnqueueAt === null) {
      this.firstEnqueueAt = Date.now();
    }

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      void this.flush();
    }, READ_URL_FLUSH_DEBOUNCE_MS);

    if (this.maxWaitTimer === null) {
      this.maxWaitTimer = setTimeout(() => {
        void this.flush();
      }, READ_URL_FLUSH_MAX_WAIT_MS);
    }
  }

  private clearTimers(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.maxWaitTimer !== null) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.firstEnqueueAt = null;
  }

  private totalPendingCount(): number {
    let count = 0;
    for (const bucket of this.buckets.values()) {
      count += bucket.pending.size;
    }
    return count;
  }

  private hasPending(): boolean {
    return this.totalPendingCount() > 0;
  }

  private async flush(): Promise<void> {
    this.clearTimers();

    if (this.isFlushing || !this.hasPending()) {
      return;
    }

    this.isFlushing = true;
    try {
      const bucketKeys = [...this.buckets.keys()];
      for (const bucketKey of bucketKeys) {
        await this.flushBucket(bucketKey);
      }
    } finally {
      this.isFlushing = false;
      if (this.hasPending()) {
        this.scheduleFlush();
      }
    }
  }

  private async flushBucket(bucketKey: string): Promise<void> {
    const bucket = this.buckets.get(bucketKey);
    if (bucket === undefined || bucket.pending.size === 0) {
      return;
    }

    const batch = [...bucket.pending].slice(0, MAX_READ_URL_BATCH_SIZE);
    for (const url of batch) {
      bucket.pending.delete(url);
    }

    const data = await this.deps.fetchBatch(batch, bucket.runtime);
    const entries: Record<string, string> = {};

    for (const url of batch) {
      const entry = data?.resolved[url];
      const presigned =
        entry !== undefined && "url" in entry && entry.url.length > 0
          ? entry.url
          : null;

      const resolve = bucket.resolversByUrl.get(url);
      bucket.resolversByUrl.delete(url);
      bucket.promiseByUrl.delete(url);

      if (presigned !== null) {
        entries[url] = presigned;
      }
      resolve?.(presigned);
    }

    if (Object.keys(entries).length > 0) {
      this.deps.onBatchResolved(entries);
    }

    if (bucket.pending.size === 0 && bucket.resolversByUrl.size === 0) {
      this.buckets.delete(bucketKey);
    }
  }
}
