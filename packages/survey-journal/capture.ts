import type { ModifiedEvent, SurveyCreatorModel } from "survey-creator-core";
import {
  JournalRecorder,
  type IJournalRecord,
} from "survey-creator-core/collaboration";

type OnRecord = (records: IJournalRecord[], jsonData: string) => void;

function guardRecorder(recorder: JournalRecorder) {
  // A recorder exception escaping into Creator leaves the undo transaction open.
  // SurveyJS does not expose this callback publicly; guard it before dispatch.
  const handler = recorder as unknown as {
    onCreatorModified(event: ModifiedEvent): void;
  };
  const original = handler.onCreatorModified.bind(handler);
  handler.onCreatorModified = (event) => {
    if (event.type === "JSON_EDITOR") return; // The JSON tab writes a whole draft.
    try {
      original(event);
    } catch {
      recorder.snapshot();
    }
  };
}

function emissionBuffer(creator: SurveyCreatorModel, onRecord: OnRecord) {
  let pending: IJournalRecord[] = [];
  const flush = () => {
    if (!pending.length) return;
    const records = pending;
    pending = [];
    onRecord(records, JSON.stringify(creator.JSON));
  };
  const capture = (
    _: JournalRecorder,
    { record }: { record: IJournalRecord },
  ) => {
    if (!pending.length) queueMicrotask(flush);
    pending.push(JSON.parse(JSON.stringify(record)));
  };
  return { capture, flush };
}

export function captureJournal(creator: SurveyCreatorModel, onRecord: OnRecord) {
  const recorder = new JournalRecorder(creator);
  guardRecorder(recorder);
  const { capture, flush } = emissionBuffer(creator, onRecord);
  recorder.onRecordAdded.add(capture);
  recorder.onRecordChanged.add(capture);
  return () => {
    flush();
    recorder.onRecordAdded.remove(capture);
    recorder.onRecordChanged.remove(capture);
    recorder.dispose();
  };
}
