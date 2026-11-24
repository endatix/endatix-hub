import { describe, expect, it } from "vitest";
import {
  prepareActionLabel,
  formatPrepareOutcome,
  getPhaseDescription,
  isBusyPhase,
  showsFiltersForm,
  showsPrepareCta,
  showsPrepareOptions,
  showsRebuildEntry,
} from "../export-dialog-phase";

describe("export-dialog-phase", () => {
  it("treats preparing and exporting as busy", () => {
    expect(isBusyPhase("preparing")).toBe(true);
    expect(isBusyPhase("exporting")).toBe(true);
    expect(isBusyPhase("ready")).toBe(false);
  });

  it("hides filters while preparing or needing prepare", () => {
    expect(showsFiltersForm("ready")).toBe(true);
    expect(showsFiltersForm("needsPrepare")).toBe(false);
    expect(showsFiltersForm("preparing")).toBe(false);
  });

  it("shows prepare CTA for needsPrepare and recoverable errors", () => {
    expect(showsPrepareCta("needsPrepare", null)).toBe(true);
    expect(
      showsPrepareCta(
        "error",
        "No processed flattened submissions found. Run admin backfill.",
      ),
    ).toBe(true);
    expect(
      showsPrepareCta(
        "error",
        "No completed submissions are available to export for this form.",
      ),
    ).toBe(false);
  });

  it("shows prepare options only in rebuild mode", () => {
    expect(showsPrepareOptions("needsPrepare", false)).toBe(false);
    expect(showsPrepareOptions("needsPrepare", true)).toBe(true);
    expect(showsPrepareOptions("error", true)).toBe(true);
    expect(showsPrepareOptions("preparing", true)).toBe(true);
    expect(showsPrepareOptions("preparing", false)).toBe(false);
    expect(showsPrepareOptions("ready", true)).toBe(false);
  });

  it("shows rebuild entry only when ready", () => {
    expect(showsRebuildEntry("ready")).toBe(true);
    expect(showsRebuildEntry("needsPrepare")).toBe(false);
    expect(showsRebuildEntry("error")).toBe(false);
  });

  it("returns phase-specific descriptions", () => {
    expect(getPhaseDescription("needsPrepare")).toContain("prepare step");
    expect(
      getPhaseDescription("needsPrepare", { rebuildMode: true }),
    ).toContain("Rebuild");
    expect(getPhaseDescription("ready")).toContain("Choose a file format");
    expect(
      getPhaseDescription("exporting", { includingIncomplete: true }),
    ).toContain("Updating incomplete submissions");
  });

  it("leaves batches out of the prepare outcome and flags failures", () => {
    expect(
      formatPrepareOutcome({ processed: 3, skipped: 1, failed: 0 }),
    ).toEqual({
      summary: "3 processed, 1 skipped, 0 failed. You can export now.",
      failed: 0,
    });
    expect(
      formatPrepareOutcome({ processed: 3, skipped: 0, failed: 2 }).summary,
    ).toContain("missing from the export");
  });
});

describe("prepareActionLabel", () => {
  it.each([
    ["needsPrepare", null, false, "Prepare for export"],
    ["error", null, false, "Try again"],
    ["error", { previousSchema: "retained" as const }, false, "Rebuild again"],
    ["error", { previousSchema: undefined }, false, "Retry rebuild"],
    [
      "error",
      { previousSchema: "retained" as const },
      true,
      "Run full recompile",
    ],
    ["error", { previousSchema: undefined }, true, "Run full recompile"],
    ["preparing", { previousSchema: undefined }, false, "Prepare for export"],
  ] as const)(
    "in %s names the action for failure %o (full recompile %s)",
    (phase, failure, full, label) => {
      expect(prepareActionLabel(phase, failure, full)).toBe(label);
    },
  );
});
