// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readCsvRecords } from "@/lib/utils/csv";

const AUDIENCE = path.join(__dirname, "../../e2e/fixtures/audience");
const GENERATOR = path.join(AUDIENCE, "generate.mjs");

const demo = (fileName: string) =>
  readFileSync(path.join(AUDIENCE, "demo", fileName), "utf8");

/** Each data row keyed by its identifier, cells keyed by header. */
function rowsOf(fileName: string): Record<string, string>[] {
  const [headers, ...rows] = readCsvRecords(demo(fileName));
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, at) => [header, cells[at]])),
  );
}

/** How the update file treats a participant, as the e2e update counts expect it. */
function updateKind(
  first: Record<string, string>,
  update: Record<string, string>,
): string {
  const differs = Object.keys(update).filter(
    (key) => update[key] !== first[key],
  );
  if (differs.length === 0)
    return first.joined ? "unchanged, joined" : "unchanged";
  const emptied = differs.every((key) => update[key] === "");
  return emptied ? "emptied" : "changed";
}

describe("audience demo fixtures", () => {
  it("are what generate.mjs writes", () => {
    const output = execFileSync("node", [GENERATOR, "--check"], {
      encoding: "utf8",
    });

    expect(output).toContain("up to date");
  });

  it("have one participant whose region the radiogroup does not list", () => {
    const survey = JSON.parse(demo("acme-demo.survey.json"));
    const radiogroup = survey.pages[0].elements.find(
      (element: { type: string }) => element.type === "radiogroup",
    );
    const choices = radiogroup.choices.map(
      (choice: { value: string }) => choice.value,
    );

    const offChoice = rowsOf("acme-demo.csv").filter(
      (row) => row.external_id && !choices.includes(row.region),
    );

    expect(offChoice.map((row) => row.external_id)).toEqual(["ACME-VIP-0003"]);
  });

  it("reject a blank identifier at row 13 and a repeat at row 21", () => {
    const identifiers = rowsOf("acme-demo.csv").map((row) => row.external_id);
    const spreadsheetRow = (at: number) => at + 2;

    expect(identifiers).toHaveLength(30);
    expect(spreadsheetRow(identifiers.indexOf(""))).toBe(13);
    expect(spreadsheetRow(identifiers.lastIndexOf("ACME-STD-0004"))).toBe(21);
    expect(new Set(identifiers.filter(Boolean)).size).toBe(28);
  });

  it("update 18 participants, empty cells for 6 and leave 4 as they were", () => {
    // Reversed, so the first row of a repeated identifier is the one kept, as the import keeps it.
    const first = new Map(
      rowsOf("acme-demo.csv")
        .reverse()
        .map((row) => [row.external_id, row]),
    );
    const update = rowsOf("acme-demo-update.csv");
    const kinds = update.map((row) =>
      updateKind(first.get(row.external_id)!, row),
    );

    expect(Object.keys(update[0])).not.toContain("joined");
    expect(update).toHaveLength(28);
    expect(kinds.filter((kind) => kind === "changed")).toHaveLength(18);
    expect(kinds.filter((kind) => kind === "emptied")).toHaveLength(6);
    expect(kinds.filter((kind) => kind === "unchanged")).toHaveLength(4);
  });
});
