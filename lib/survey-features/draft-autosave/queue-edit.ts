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

function cursorBefore(queue: DraftQueue, saveNo: number) {
  let cursor = queue.base.recordsSinceSnapshot;
  for (const prior of queue.edits) {
    if (prior.saveNo === saveNo) break;
    const period = journalPeriod(prior.jsonData);
    cursor = prior.records.length
      ? ((cursor >= period ? 0 : cursor) + prior.records.length) % period
      : 0;
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
  next: LocalEdit,
) {
  const groups = previous?.groups ?? [];
  const start = previous?.records.length ?? 0;
  const end = next.records.length;
  if (!containsCandidate(start, end, cursorBefore(queue, next.saveNo)))
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
  const last = edits.at(-1);
  const sameWriter =
    last && Boolean(last.records.length) === Boolean(records.length);
  const previous =
    sameWriter && last.saveNo > queue.sealed ? edits.pop() : undefined;
  const saveNo = previous?.saveNo ?? queue.next;
  const next = {
    saveNo,
    jsonData,
    records: previous ? [...previous.records, ...records] : records,
  };
  edits.push({ ...next, groups: captureCandidate(queue, previous, next) });
  return { ...queue, edits, next: saveNo + 1 };
}
