import { describe, expect, it } from "vitest";
import { getExportErrorMessage } from "../../export-error-message";

describe("getExportErrorMessage", () => {
  it("maps backfill-related API errors to an operator hint", () => {
    const message = getExportErrorMessage(
      "No processed flattened submissions found. Run admin backfill to populate the reporting read model before exporting.",
    );

    expect(message).toContain("backfill");
  });

  it("returns the original message for unrelated errors", () => {
    const message = getExportErrorMessage("Export format is not supported.");

    expect(message).toBe("Export format is not supported.");
  });

  it("returns a default message when the API error is missing", () => {
    expect(getExportErrorMessage(undefined, 500)).toContain(
      "problem exporting",
    );
  });
});
