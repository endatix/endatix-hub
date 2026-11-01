import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import {
  includeInProgressOutcome,
  prepareOutcome,
} from "../readiness-action-outcome";

const SUMMARY = {
  formDefinitionId: "3",
  batches: 1,
  processed: 12,
  skipped: 0,
  failed: 0,
};

describe("prepareOutcome", () => {
  it("reloads the grid after a full prepare", () => {
    expect(prepareOutcome(Result.success(SUMMARY))).toEqual({
      variant: "success",
      message: "Prepared 12 submissions.",
      refresh: true,
    });
  });

  it("warns when some submissions could not be prepared", () => {
    // Act
    const outcome = prepareOutcome(Result.success({ ...SUMMARY, failed: 2 }));

    // Assert
    expect(outcome).toMatchObject({ variant: "warning", refresh: true });
  });

  it("keeps the grid and shows the message when prepare fails", () => {
    expect(prepareOutcome(Result.error("Backfill stopped"))).toEqual({
      variant: "error",
      message: "Backfill stopped",
      refresh: false,
    });
  });
});

describe("includeInProgressOutcome", () => {
  it("reloads the grid when every in-progress submission is included", () => {
    // Act
    const outcome = includeInProgressOutcome(
      Result.success({ kind: "refreshed", failed: 0, finished: true }),
    );

    // Assert
    expect(outcome).toMatchObject({ variant: "success", refresh: true });
  });

  it("says to run again when the batch limit stopped it", () => {
    // Act
    const outcome = includeInProgressOutcome(
      Result.success({ kind: "refreshed", failed: 0, finished: false }),
    );

    // Assert
    expect(outcome).toMatchObject({ variant: "warning", refresh: true });
    expect(outcome.message).toContain("again");
  });

  it("does not reload when the user may not edit the form", () => {
    // Act
    const outcome = includeInProgressOutcome(
      Result.success({ kind: "skipped" }),
    );

    // Assert
    expect(outcome).toMatchObject({ variant: "warning", refresh: false });
  });
});
