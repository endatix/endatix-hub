import type { IJournalRecord } from "survey-creator-core/collaboration";
import { writerHash } from "@endatix/survey-journal/hash";
import type {
  DraftJournalBatch,
  FormDraft,
} from "@/lib/endatix-api/forms/types";

export type LocalEdit = Pick<
  DraftJournalBatch,
  "saveNo" | "jsonData" | "records"
>;

function interiorOffsets(edit: LocalEdit, tail: number) {
  const period =
    new TextEncoder().encode(edit.jsonData).length > 500_000 ? 100 : 200;
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

export async function journalBatch(
  clientSessionId: string,
  edit: LocalEdit,
  base: Pick<FormDraft, "jsonData" | "recordsSinceSnapshot">,
): Promise<DraftJournalBatch> {
  const offsets = interiorOffsets(edit, base.recordsSinceSnapshot);
  const checkpoints = offsets.length ? (await import("@endatix/survey-journal/replay")).verifiedCheckpoints(
    { base: base.jsonData, terminal: edit.jsonData },
    edit.records as unknown as IJournalRecord[],
    offsets,
  ) : [];
  return {
    ...edit,
    clientSessionId,
    checkpoints,
    contentHash: await writerHash(edit.jsonData),
  };
}
