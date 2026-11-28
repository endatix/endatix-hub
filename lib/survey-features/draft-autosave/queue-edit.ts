import type { DraftQueue } from "./controller";
import type { LocalEdit } from "./journal-batch";

export interface CandidateGroup {
  start: number;
  end: number;
  before: string;
  after: string;
}

export function journalPeriod(jsonData: string) {
  return new TextEncoder().encode(jsonData).byteLength > 500_000 ? 100 : 200;
}

function advance(cursor: number, count: number, period: number) {
  return count ? ((cursor >= period ? 0 : cursor) + count) % period : 0;
}

function cursorBefore(queue: DraftQueue, previous?: LocalEdit) {
  const last = queue.edits.at(-1)?.cursor;
  if (last?.version === queue.base.version) return previous ? last.before : last.after;
  let cursor = queue.base.recordsSinceSnapshot;
  for (const prior of queue.edits) {
    if (prior === previous) break;
    cursor = advance(cursor, prior.records.length, prior.cursor?.period ?? journalPeriod(prior.jsonData));
  }
  return cursor;
}

function containsCandidate(start: number, end: number, cursor: number) {
  return [100, 200].some((period) =>
    [0, cursor >= period ? 0 : cursor].some(
      (tail) =>
        Math.floor((tail + start) / period) < Math.floor((tail + end) / period),
    ),
  );
}

function captureCandidate(
  queue: DraftQueue,
  previous: LocalEdit | undefined,
  next: LocalEdit & { cursor: NonNullable<LocalEdit["cursor"]> },
) {
  const groups = previous?.groups ?? [];
  const start = previous?.records.length ?? 0;
  const end = next.records.length;
  if (!containsCandidate(start, end, next.cursor.before))
    return groups;
  const before = queue.edits.at(-1)?.jsonData ?? queue.base.jsonData;
  return [...groups, { start, end, before, after: next.jsonData }];
}

export function queueEdit(
  queue: DraftQueue,
  jsonData: string,
  records: LocalEdit["records"],
): DraftQueue {
  const edits = [...queue.edits];
  const previous = mergeable(edits.at(-1), queue.sealed, records) ? edits.pop() : undefined;
  const saveNo = previous?.saveNo ?? queue.next;
  const before = cursorBefore(queue, previous);
  const period = journalPeriod(jsonData);
  const combined = previous ? [...previous.records, ...records] : records;
  const next = {
    saveNo,
    jsonData,
    records: combined,
    cursor: { version: queue.base.version, before, after: advance(before, combined.length, period), period },
  };
  edits.push({ ...next, groups: captureCandidate(queue, previous, next) });
  return { ...queue, edits, next: saveNo + 1 };
}

function mergeable(last: LocalEdit | undefined, sealed: number, records: LocalEdit["records"]) {
  return last && last.saveNo > sealed && Boolean(last.records.length) === Boolean(records.length);
}
