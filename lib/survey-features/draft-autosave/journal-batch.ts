import type { IJournalRecord } from "survey-creator-core/collaboration";
import { writerHash } from "@endatix/survey-journal/hash";
import { journalPeriod, type CandidateGroup } from "./queue-edit";
import type {
  DraftJournalBatch,
  FormDraft,
} from "@/lib/endatix-api/forms/types";

export type LocalEdit = Pick<
  DraftJournalBatch,
  "saveNo" | "jsonData" | "records"
> & {
  groups?: CandidateGroup[];
  cursor?: { version: string; before: number; after: number; period: number };
};

function interiorOffsets(edit: LocalEdit, tail: number) {
  const period = edit.cursor?.period ?? journalPeriod(edit.jsonData);
  const offsets = [];
  for (
    let n = period - (tail >= period ? 0 : tail);
    n < edit.records.length;
    n += period
  ) {
    offsets.push(n);
  }
  return offsets;
}

type CheckpointReplay = typeof import("@endatix/survey-journal/replay").verifiedCheckpoints;

function groupCheckpoints(group: CandidateGroup, offsets: number[], context: { records: IJournalRecord[]; replay: CheckpointReplay }) {
  const inside = offsets.filter(offset => group.start < offset && offset < group.end);
  const relative = inside.map(offset => offset - group.start);
  const records = context.records.slice(group.start, group.end);
  const checkpoints = context.replay({base: group.before, terminal: group.after}, records, relative)
    .map(point => ({ ...point, afterRecord: group.start + point.afterRecord }));
  if (offsets.includes(group.end)) checkpoints.push({afterRecord: group.end, jsonData: group.after});
  return checkpoints;
}

async function captureCheckpoints(
  edit: LocalEdit,
  base: string,
  offsets: number[],
) {
  if (!offsets.length) return [];
  const { verifiedCheckpoints } =
    await import("@endatix/survey-journal/replay");
  const records = edit.records as unknown as IJournalRecord[];
  const context = {records, replay: verifiedCheckpoints};
  const checkpoints = edit.groups?.flatMap(group => groupCheckpoints(group, offsets, context)) ?? [];
  if (checkpoints.length === offsets.length) return checkpoints;
  // A different remote cursor can require a prefix outside the retained candidates.
  return verifiedCheckpoints({ base, terminal: edit.jsonData }, records, offsets);
}

export async function journalBatch(
  clientSessionId: string,
  edit: LocalEdit,
  base: Pick<FormDraft, "jsonData" | "recordsSinceSnapshot">,
): Promise<DraftJournalBatch> {
  const offsets = interiorOffsets(edit, base.recordsSinceSnapshot);
  const checkpoints = await captureCheckpoints(edit, base.jsonData, offsets);
  return {
    records: edit.records,
    saveNo: edit.saveNo,
    jsonData: edit.jsonData,
    clientSessionId,
    checkpoints,
    contentHash: await writerHash(edit.jsonData),
  };
}
