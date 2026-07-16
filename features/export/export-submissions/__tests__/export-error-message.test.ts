import { describe, expect, it } from "vitest";
import {
  getExportErrorMessage,
  getExportFailureMessage,
} from "../../export-error-message";

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

  it("returns the API message for missing form schema compilation", () => {
    const apiMessage =
      "Form schema has not been compiled for this form. Save or publish the form definition to trigger compilation.";

    expect(getExportErrorMessage(apiMessage)).toBe(apiMessage);
  });

  it("returns a default message when the API error is missing", () => {
    expect(getExportErrorMessage(undefined, 500)).toContain(
      "problem exporting",
    );
  });
});

describe("getExportFailureMessage", () => {
  it("returns the error message from thrown errors", () => {
    expect(
      getExportFailureMessage(new Error("Export format is not supported.")),
    ).toBe("Export format is not supported.");
  });

  it("returns a default message for non-error values", () => {
    expect(getExportFailureMessage("unexpected")).toContain(
      "problem exporting",
    );
  });
});
