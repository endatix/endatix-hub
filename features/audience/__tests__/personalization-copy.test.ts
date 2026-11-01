import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "@/features/config/__tests__/support/scan-source-files";

const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * One name per personalization action and US spelling, as in GLOSSARY.md and the docs
 * (endatix-hub#1212). Code identifiers such as `test-as-person` are not copy and stay.
 *
 * Scans non-test `.ts`/`.tsx` sources only, which is why this file's own patterns do not match.
 * Tests assert the copy through the components they render.
 */
describe("personalization copy", () => {
  it("names the test action Test as this participant", () => {
    expect(scanSourceFiles(REPO_ROOT, /Test as this person/i)).toEqual([]);
  });

  it("spells personalized the US way", () => {
    expect(scanSourceFiles(REPO_ROOT, /personalis/i)).toEqual([]);
  });

  it("names the add and import test toggles test participant", () => {
    const add = readFileSync(
      path.join(
        REPO_ROOT,
        "features/audience/create-person/ui/add-person-panel.tsx",
      ),
      "utf8",
    );
    const columns = readFileSync(
      path.join(
        REPO_ROOT,
        "features/audience/import-csv/ui/import-columns-step.tsx",
      ),
      "utf8",
    );

    expect(add).toContain('label="Add as test participant"');
    expect(add).toContain(
      'help="A test participant is never sent a personalized link. Use them to try the form with Test as this participant."',
    );
    expect(columns).toContain('label="Import as test participants"');
    expect(columns).toContain(
      'help="Test participants are never sent a personalized link. Use them to try the form with Test as this participant."',
    );
  });
});
