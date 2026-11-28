// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { captureJournal } from "../capture";
import { JOURNAL_VERSION, JournalOp } from "survey-creator-core/collaboration";

it("keeps both emissions when the recorder changes its last record", () => {
  // Arrange
  const creator = new SurveyCreatorModel({});
  creator.JSON = {
    pages: [{ name: "p", elements: [{ type: "text", name: "q" }] }],
  };
  const emissions: { seq: number; value: unknown }[] = [];
  const question = creator.survey.getQuestionByName("q");
  const detach = captureJournal(creator, (records) => {
    for (const record of records)
      emissions.push({
        seq: record.seq,
        value: "value" in record.payload && record.payload.value,
      });
  });

  // Act
  question.title = "First";
  question.title = "Second";
  detach();
  question.title = "Third";

  // Assert
  expect(emissions).toEqual([
    { seq: 1, value: "First" },
    { seq: 1, value: "Second" },
  ]);
});

it("falls back to a snapshot on a same-position choice drop and records the following edit", () => {
  const creator = new SurveyCreatorModel({});
  creator.JSON = {
    elements: [{ type: "radiogroup", name: "q", choices: ["a", "b"] }],
  };
  const ops: JournalOp[] = [];
  const detach = captureJournal(creator, (records) =>
    ops.push(...records.map((r) => r.op)),
  );
  const choices = creator.survey.getQuestionByName("q").choices;
  creator.startUndoRedoTransaction("drag");
  const [choice] = choices.splice(1, 1);
  choices.splice(1, 0, choice);
  creator.stopUndoRedoTransaction();
  creator.survey.title = "Still editable";
  detach();
  expect(JOURNAL_VERSION).toBe(1);
  expect(ops).toEqual([JournalOp.FullSnapshot, JournalOp.PropertyChanged]);
  creator.dispose();
});
