import type { SubmissionView } from "@/lib/endatix-api/reporting/submission-view-types";
import { Result } from "@/lib/result";
import { describe, expect, it } from "vitest";
import {
  saveViewOutcome,
  VIEW_CONFLICT_MESSAGE,
} from "../submission-grid-view-save-outcome";

const VIEW = { version: "3", settings: { v: 1 as const, columns: [] } };

describe("saveViewOutcome", () => {
  it("hands back the saved view", () => {
    expect(saveViewOutcome(Result.success(VIEW))).toEqual({
      kind: "saved",
      view: VIEW,
    });
  });

  it("reads a 409 as someone saving first", () => {
    // Arrange
    const stale = Result.error<SubmissionView>(
      "Conflict",
      undefined,
      undefined,
      {
        statusCode: 409,
      },
    );

    // Act & Assert
    expect(saveViewOutcome(stale)).toEqual({
      kind: "conflict",
      message: VIEW_CONFLICT_MESSAGE,
    });
  });

  it("passes any other failure through", () => {
    // Arrange
    const failed = Result.error<SubmissionView>(
      "Settings are too large.",
      undefined,
      undefined,
      {
        statusCode: 400,
      },
    );

    // Act & Assert
    expect(saveViewOutcome(failed)).toEqual({
      kind: "error",
      message: "Settings are too large.",
    });
  });
});
