import { describe, expect, it } from "vitest";
import type { SubmissionGridSearchKeysResponse } from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import {
  SEARCH_KEYS_BUSY_MESSAGE,
  searchKeyOutcome,
} from "@/features/submissions/ui/search-key-outcome";

const RESPONSE: SubmissionGridSearchKeysResponse = {
  formId: "1",
  keys: [{ key: "city", source: "user", filterType: "text", pending: true }],
  slots: { used: 51, max: 64, userUsed: 1, userMax: 14 },
};

describe("searchKeyOutcome", () => {
  it("says an added column filters once prepared", () => {
    expect(searchKeyOutcome("add", "City", Result.success(RESPONSE))).toEqual({
      variant: "success",
      message: '"City" is filterable once its answers are prepared.',
    });
  });

  it("confirms a removal", () => {
    expect(
      searchKeyOutcome("remove", "City", Result.success(RESPONSE)),
    ).toMatchObject({
      variant: "success",
      message: '"City" is no longer filterable.',
    });
  });

  it("keeps the API's cap message on a 400", () => {
    // Arrange
    const cap = "A form can have 14 chosen search keys and 64 in all.";
    const refused = Result.validationError<SubmissionGridSearchKeysResponse>(
      cap,
      undefined,
      undefined,
      { statusCode: 400 },
    );

    // Act & Assert
    expect(searchKeyOutcome("add", "City", refused)).toEqual({
      variant: "error",
      message: cap,
    });
  });

  it("asks to retry when the form's schema was busy (503)", () => {
    // Arrange
    const busy = Result.error<SubmissionGridSearchKeysResponse>(
      "Service Unavailable",
      undefined,
      undefined,
      { statusCode: 503 },
    );

    // Act & Assert
    expect(searchKeyOutcome("add", "City", busy)).toEqual({
      variant: "error",
      message: SEARCH_KEYS_BUSY_MESSAGE,
    });
  });
});
