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
> & { groups?: CandidateGroup[] };

function interiorOffsets(edit: LocalEdit, tail: number) {
  const period = journalPeriod(edit.jsonData);
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

async function captureCheckpoints(
  edit: LocalEdit,
  base: string,
  offsets: number[],
) {
  if (!offsets.length) return [];
  const { verifiedCheckpoints } =
    await import("@endatix/survey-journal/replay");
  const records = edit.records as unknown as IJournalRecord[];
  const checkpoints = [];
  for (const offset of offsets) {
    const group = edit.groups?.find((g) => g.start < offset && offset <= g.end);
    if (!group) {
      // An unforeseen remote cursor: only a verified reconstruction can supply its missing prefix.
      return verifiedCheckpoints(
        { base, terminal: edit.jsonData },
        records,
        offsets,
      );
    }
    if (group.end === offset)
      checkpoints.push({ afterRecord: offset, jsonData: group.after });
    else {
      const [prefix] = verifiedCheckpoints(
        { base: group.before, terminal: group.after },
        records.slice(group.start, group.end),
        [offset - group.start],
      );
      checkpoints.push({ afterRecord: offset, jsonData: prefix.jsonData });
    }
  }
  return checkpoints;
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
