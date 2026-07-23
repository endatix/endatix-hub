import { describe, expect, it } from "vitest";
import {
  getExportErrorMessage,
  getExportFailureMessage,
  isExportPrepareRecoveryError,
  isExportSchemaMissingError,
} from "../../export-error-message";

describe("getExportErrorMessage", () => {
  it("maps backfill-related API errors to an operator hint", () => {
    const message = getExportErrorMessage(
      "No processed flattened submissions found. Run admin backfill to populate the reporting read model before exporting.",
    );

    expect(message).toContain("backfill");
  });

  it("maps no-completed API errors without suggesting backfill", () => {
    const message = getExportErrorMessage(
      "No completed submissions are available to export for this form. Incomplete drafts are not included in the reporting export.",
    );

    expect(message).toContain(
      "No completed submissions are available to export",
    );
    expect(message.toLowerCase()).not.toContain("backfill");
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

describe("isExportSchemaMissingError", () => {
  it("detects schema-specific missing/compile messages", () => {
    expect(
      isExportSchemaMissingError(
        "Form schema not found. Compile the schema first.",
      ),
    ).toBe(true);
    expect(
      isExportSchemaMissingError(
        "Form schema has not been compiled for this form.",
      ),
    ).toBe(true);
    expect(isExportSchemaMissingError("FormSchema not found")).toBe(true);
  });

  it("does not treat a generic form-not-found message as missing schema", () => {
    expect(isExportSchemaMissingError("Form not found.")).toBe(false);
    expect(
      isExportSchemaMissingError("Form not found or export is unavailable."),
    ).toBe(false);
  });
});

describe("isExportPrepareRecoveryError", () => {
  it("detects schema and backfill recovery cases", () => {
    expect(
      isExportPrepareRecoveryError(
        "Form schema has not been compiled for this form.",
      ),
    ).toBe(true);
    expect(
      isExportPrepareRecoveryError(
        "No processed flattened submissions found. Run admin backfill.",
      ),
    ).toBe(true);
    expect(
      isExportPrepareRecoveryError("Export format is not supported."),
    ).toBe(false);
  });

  it("does not treat empty completed-export as prepare recovery", () => {
    expect(
      isExportPrepareRecoveryError(
        "No completed submissions are available to export for this form.",
      ),
    ).toBe(false);
  });
});
