import { describe, expect, it } from "vitest";
import {
  getPhaseDescription,
  isBusyPhase,
  showsFiltersForm,
  showsPrepareCta,
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

  it("returns phase-specific descriptions", () => {
    expect(getPhaseDescription("needsPrepare")).toContain("prepare step");
    expect(getPhaseDescription("ready")).toContain("Choose a format");
  });
});
