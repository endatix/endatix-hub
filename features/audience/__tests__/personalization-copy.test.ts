import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "@/features/config/__tests__/support/scan-source-files";

const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * One name per personalization action and US spelling, as in GLOSSARY.md and the docs
 * (endatix-hub#1212). Code identifiers such as `test-as-person` are not copy and stay.
 */
describe("personalization copy", () => {
  it("names the test action Test as this participant", () => {
    expect(scanSourceFiles(REPO_ROOT, /Test as this person/i)).toEqual([]);
  });

  it("spells personalized the US way", () => {
    expect(scanSourceFiles(REPO_ROOT, /personalis/i)).toEqual([]);
  });
});
