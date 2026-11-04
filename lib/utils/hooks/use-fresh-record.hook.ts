"use client";

import { useEffect, useState } from "react";
import { Result } from "@/lib/result";

export type FreshRecord<T> = {
  /** The re-read record once it lands; the snapshot until then, or when the read failed. */
  record: T;
  /** The re-read is in flight: skeleton the volatile facts, keep the rest. */
  refreshing: boolean;
};

type Settled<T> = { key: string; value: T | null };

/** The record, or `null` when the read failed or threw: the caller keeps its snapshot. */
async function readOrNull<T>(
  read: (key: string) => Promise<Result<T>>,
  key: string,
): Promise<T | null> {
  try {
    const result = await read(key);
    return Result.isSuccess(result) ? result.value : null;
  } catch {
    return null;
  }
}

/**
 * Re-reads a record the reader already has a snapshot of (a list row), because the facts that
 * change on their own (counts, status) may be stale. Mount it inside the overlay content, which
 * unmounts on close, so every opening reads again; never cache the answer. A failed read keeps
 * the snapshot quietly. `read` must be stable (a server action import, not an inline lambda).
 */
export function useFreshRecord<T>(
  snapshot: T,
  key: string,
  read: (key: string) => Promise<Result<T>>,
): FreshRecord<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  useEffect(() => {
    let current = true;
    void readOrNull(read, key).then((value) => {
      if (current) setSettled({ key, value });
    });
    return () => {
      current = false;
    };
  }, [key, read]);
  const done = settled?.key === key;
  return { record: (done && settled.value) || snapshot, refreshing: !done };
}
