import { describe, expect, it } from "vitest";
import {
  isOwnedByCurrentUser,
  resolveDeleteSubmissionKind,
  resolveDeleteSubmissionRisk,
} from "../delete-submission-risk";

describe("isOwnedByCurrentUser", () => {
  it("matches submitterDisplayId to the session user id", () => {
    expect(
      isOwnedByCurrentUser({
        submitterId: "999",
        submitterDisplayId: "1496113070806663168",
        currentUserId: "1496113070806663168",
      }),
    ).toBe(true);
  });

  it("falls back to submitterId when display id is absent", () => {
    expect(
      isOwnedByCurrentUser({
        submitterId: "1496113070806663168",
        submitterDisplayId: null,
        currentUserId: "1496113070806663168",
      }),
    ).toBe(true);
  });

  it("returns false when neither identity matches", () => {
    expect(
      isOwnedByCurrentUser({
        submitterId: "999",
        submitterDisplayId: "someone-else",
        currentUserId: "1496113070806663168",
      }),
    ).toBe(false);
  });
});

describe("resolveDeleteSubmissionKind", () => {
  it("returns test for test submissions", () => {
    expect(
      resolveDeleteSubmissionKind({
        isTestSubmission: true,
        submitterId: "other-user",
        currentUserId: "me",
      }),
    ).toBe("test");
  });

  it("returns owned when submitterDisplayId matches current user", () => {
    expect(
      resolveDeleteSubmissionKind({
        isTestSubmission: false,
        submitterId: "internal-submitter-pk",
        submitterDisplayId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe("owned");
  });

  it("returns owned when submitterId matches current user", () => {
    expect(
      resolveDeleteSubmissionKind({
        isTestSubmission: false,
        submitterId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe("owned");
  });

  it("returns respondent for other submitters", () => {
    expect(
      resolveDeleteSubmissionKind({
        isTestSubmission: false,
        submitterId: "respondent-pk",
        submitterDisplayId: "respondent",
        currentUserId: "admin",
      }),
    ).toBe("respondent");
  });
});

describe("resolveDeleteSubmissionRisk", () => {
  it("returns low for test submissions", () => {
    expect(
      resolveDeleteSubmissionRisk({
        isTestSubmission: true,
        submitterId: "other-user",
        currentUserId: "me",
      }),
    ).toBe("low");
  });

  it("returns low when submitter display id matches current user", () => {
    expect(
      resolveDeleteSubmissionRisk({
        isTestSubmission: false,
        submitterId: "pk",
        submitterDisplayId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe("low");
  });

  it("returns elevated for respondent submissions from others", () => {
    expect(
      resolveDeleteSubmissionRisk({
        isTestSubmission: false,
        submitterId: "respondent",
        currentUserId: "admin",
      }),
    ).toBe("elevated");
  });

  it("returns elevated when submitter or current user is missing", () => {
    expect(
      resolveDeleteSubmissionRisk({
        isTestSubmission: false,
        submitterId: null,
        currentUserId: "admin",
      }),
    ).toBe("elevated");

    expect(
      resolveDeleteSubmissionRisk({
        isTestSubmission: undefined,
        submitterId: "user-1",
        currentUserId: undefined,
      }),
    ).toBe("elevated");
  });
});
