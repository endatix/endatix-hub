// @vitest-environment jsdom
import { expect, it } from "vitest";
import fixture from "@/packages/survey-journal/__tests__/fixtures/title-and-rename.json";
import { journalBatch } from "../journal-batch";

it("checkpoints the title before the rename at cursor 199", async () => {
  const edit = {
    saveNo: 12,
    records: fixture.records,
    jsonData: JSON.stringify(fixture.terminal),
  };
  const base = {
    jsonData: JSON.stringify(fixture.base),
    recordsSinceSnapshot: 199,
  };
  const result = await journalBatch("editor", edit, base);
  expect(
    result.checkpoints?.map((c) => [c.afterRecord, JSON.parse(c.jsonData)]),
  ).toEqual([[1, fixture.prefix]]);
  expect(result.jsonData).toBe(edit.jsonData);
});
