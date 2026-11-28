import { SurveyCreatorModel } from "survey-creator-core";
import {
  JournalApplier,
  JournalRecorder,
  type IJournalRecord,
} from "survey-creator-core/collaboration";
import { canonicalSurvey } from "./hash";

/** Reload each checkpoint the same way a history reader starts the following segment. */
export function replaySegment(
  jsonData: string,
  records: readonly IJournalRecord[],
) {
  const model = new SurveyCreatorModel({});
  const recorder = new JournalRecorder(model);
  try {
    model.JSON = JSON.parse(jsonData);
    const results = new JournalApplier(model, recorder).apply(
      structuredClone([...records]),
    );
    if (results.some((result) => !result.success))
      throw new Error("Draft journal replay failed.");
    return JSON.stringify(model.JSON);
  } finally {
    recorder.dispose();
    model.dispose();
  }
}

export function verifiedCheckpoints(
  survey: { base: string; terminal: string },
  records: readonly IJournalRecord[],
  offsets: readonly number[],
) {
  if (!offsets.length) return [];
  let document = survey.base;
  let previous = 0;
  const checkpoints = offsets.map((afterRecord) => {
    document = replaySegment(document, records.slice(previous, afterRecord));
    previous = afterRecord;
    return { afterRecord, jsonData: document };
  });
  const terminal = replaySegment(document, records.slice(previous));
  const expected = canonicalSurvey(survey.terminal);
  if (
    canonicalSurvey(terminal) !== expected ||
    canonicalSurvey(replaySegment(survey.base, records)) !== expected
  ) {
    throw new Error("Draft journal differs from the local document.");
  }
  return checkpoints;
}
