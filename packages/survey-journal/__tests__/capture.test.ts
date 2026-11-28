// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { captureJournal } from "../capture";

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
