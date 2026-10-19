import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import {
  deleteTestsConfirmCopy,
  deleteTestsOutcome,
  submissionTestAccess,
  testMarkMenuItem,
  testMarkOutcome,
} from "../submission-test-flag";

const CAN_MARK = { canMark: true, canDeleteTests: false };

describe("testMarkMenuItem", () => {
  it("offers Mark as test on a real submission", () => {
    // Act
    const item = testMarkMenuItem({ isTestSubmission: false }, CAN_MARK);

    // Assert
    expect(item).toEqual({ label: "Mark as test", isTest: true });
  });

  it("treats a submission without the flag as real", () => {
    // Act
    const item = testMarkMenuItem({}, CAN_MARK);

    // Assert
    expect(item?.label).toBe("Mark as test");
  });

  it("offers Mark as real on a test submission", () => {
    // Act
    const item = testMarkMenuItem({ isTestSubmission: true }, CAN_MARK);

    // Assert
    expect(item).toEqual({ label: "Mark as real", isTest: false });
  });

  it("hides the item without forms.test", () => {
    // Act
    const item = testMarkMenuItem(
      { isTestSubmission: true },
      { canMark: false, canDeleteTests: false },
    );

    // Assert
    expect(item).toBeNull();
  });
});

describe("testMarkOutcome", () => {
  it("says the submission is now a test submission", () => {
    // Act
    const outcome = testMarkOutcome(true, Result.success(undefined));

    // Assert
    expect(outcome).toEqual({
      variant: "success",
      message: "Marked as a test submission.",
      refresh: true,
    });
  });

  it("says the submission is now real", () => {
    // Act
    const outcome = testMarkOutcome(false, Result.success(undefined));

    // Assert
    expect(outcome.message).toBe("Marked as a real submission.");
  });

  it("keeps the API's message and names the existing submission on submission_exists", () => {
    // Arrange
    const conflict = Result.error<void>(
      "A submission already exists for this user and form.",
      undefined,
      "submission_exists",
      { statusCode: 409, existingId: "7" },
    );

    // Act
    const outcome = testMarkOutcome(false, conflict);

    // Assert
    expect(outcome).toEqual({
      variant: "error",
      message: "A submission already exists for this user and form.",
      hint: "Mark the submitter's real submission as test first.",
      refresh: false,
      existingSubmissionId: "7",
    });
  });

  it("keeps the API's message for other failures", () => {
    // Act
    const outcome = testMarkOutcome(
      true,
      Result.error("Submission not found."),
    );

    // Assert
    expect(outcome).toEqual({
      variant: "error",
      message: "Submission not found.",
      refresh: false,
    });
  });
});

describe("deleteTestsConfirmCopy", () => {
  it("names the count", () => {
    expect(deleteTestsConfirmCopy(3)).toEqual({
      title: "Delete 3 test submissions?",
      canDelete: true,
    });
  });

  it("uses the singular for one", () => {
    expect(deleteTestsConfirmCopy(1).title).toBe("Delete 1 test submission?");
  });

  it("has nothing to delete at zero", () => {
    expect(deleteTestsConfirmCopy(0)).toEqual({
      title: "There are no test submissions to delete.",
      canDelete: false,
    });
  });

  it("says the count could not be read", () => {
    expect(deleteTestsConfirmCopy(null)).toEqual({
      title: "Delete all test submissions?",
      note: "The number of test submissions could not be read.",
      canDelete: true,
    });
  });
});

describe("deleteTestsOutcome", () => {
  it("names how many were deleted", () => {
    expect(deleteTestsOutcome(Result.success({ deletedCount: 2 }))).toEqual({
      variant: "success",
      message: "Deleted 2 test submissions.",
      refresh: true,
    });
  });

  it("keeps the API's message on failure", () => {
    expect(deleteTestsOutcome(Result.error("Forbidden."))).toEqual({
      variant: "error",
      message: "Forbidden.",
      refresh: false,
    });
  });
});

describe("submissionTestAccess", () => {
  it("marks with forms.test alone", () => {
    expect(
      submissionTestAccess({ formsTest: true, submissionsDelete: false }),
    ).toEqual({ canMark: true, canDeleteTests: false });
  });

  it("deletes test submissions only with forms.test and submissions.delete", () => {
    expect(
      submissionTestAccess({ formsTest: true, submissionsDelete: true }),
    ).toEqual({ canMark: true, canDeleteTests: true });
    expect(
      submissionTestAccess({ formsTest: false, submissionsDelete: true }),
    ).toEqual({ canMark: false, canDeleteTests: false });
  });
});
