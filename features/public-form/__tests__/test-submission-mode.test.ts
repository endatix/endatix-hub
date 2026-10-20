import { describe, expect, it } from "vitest";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { testSubmissionMode } from "../test-submission-mode";

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "21",
    formId: "1",
    formDefinitionId: "2",
    isComplete: false,
    jsonData: "{}",
    currentPage: 0,
    metadata: "{}",
    token: "t",
    createdAt: new Date(),
    modifiedAt: new Date(),
    status: "draft",
    ...overrides,
  };
}

const testSubmission = submission({
  isTestSubmission: true,
  personalization: {
    identifier: "tester@example.com",
    capturedAt: "2026-10-19T00:00:00Z",
    variables: {},
    source: PersonalizationSource.Test,
  },
});

describe("testSubmissionMode", () => {
  it("shows nothing on a real submission for a respondent", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: false,
        submission: submission(),
      }),
    ).toEqual({ showBadge: false, startOverSubmissionId: null });
  });

  it("shows the badge in test mode without a submission", () => {
    expect(testSubmissionMode({ isRespondentTestMode: true })).toEqual({
      showBadge: true,
      startOverSubmissionId: null,
    });
  });

  it("shows the badge on a test submission even outside test mode", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: false,
        submission: testSubmission,
      }),
    ).toEqual({
      showBadge: true,
      startOverSubmissionId: null,
      writeToken: "t",
    });
  });

  it("offers Start over on a person's test submission to a viewer who may test, even outside test mode", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: false,
        canStartOverTest: true,
        submission: testSubmission,
      }),
    ).toEqual({
      showBadge: true,
      startOverSubmissionId: "21",
      writeToken: "t",
    });
  });

  it("does not offer Start over to a viewer who may not test, even in test mode", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: true,
        submission: testSubmission,
      }).startOverSubmissionId,
    ).toBeNull();
  });

  it.each([
    PersonalizationSource.Link,
    PersonalizationSource.OnBehalf,
    undefined,
  ])("does not offer Start over on a %s personalization", (source) => {
    const other = submission({
      isTestSubmission: true,
      personalization: { ...testSubmission.personalization!, source },
    });

    expect(
      testSubmissionMode({ isRespondentTestMode: true, submission: other })
        .startOverSubmissionId,
    ).toBeNull();
  });

  it("does not offer Start over on a URL-token page, which ignores the cookie", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: true,
        canStartOverTest: true,
        submission: testSubmission,
        urlToken: "access-token",
      }).startOverSubmissionId,
    ).toBeNull();
  });

  it("saves a person's test submission with its own token, not the form cookie", () => {
    expect(
      testSubmissionMode({
        isRespondentTestMode: false,
        submission: testSubmission,
      }).writeToken,
    ).toBe("t");
  });

  it("leaves every other page on the cookie or its URL token", () => {
    const real = submission({ isTestSubmission: true });
    expect(
      testSubmissionMode({ isRespondentTestMode: true, submission: real })
        .writeToken,
    ).toBeUndefined();
    expect(
      testSubmissionMode({
        isRespondentTestMode: false,
        submission: testSubmission,
        urlToken: "access",
      }).writeToken,
    ).toBeUndefined();
  });
});
