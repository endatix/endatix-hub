import { describe, expect, it } from "vitest";
import {
  editSubmissionErrorMessage,
  SCREENED_OUT_EDIT_ERROR,
} from "../collection-status";

describe("editSubmissionErrorMessage", () => {
  it("explains that screened-out submissions are locked", () => {
    // Arrange
    const collectionStatus = "screen_out";

    // Act
    const message = editSubmissionErrorMessage(collectionStatus);

    // Assert
    expect(message).toBe(SCREENED_OUT_EDIT_ERROR);
  });

  it.each([["complete"], ["in_progress"], [undefined]])(
    "falls back to the generic message for %s",
    (collectionStatus) => {
      // Arrange & Act
      const message = editSubmissionErrorMessage(collectionStatus);

      // Assert
      expect(message).toBe("Failed to save changes");
    },
  );
});
