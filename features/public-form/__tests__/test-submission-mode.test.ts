import { describe, expect, it } from "vitest";
import { toTestInspectorView } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import {
  canStartOverTestSubmission,
  testCornerFor,
  testWriteToken,
} from "../test-submission-mode";

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

const view = toTestInspectorView({
  formId: "1",
  submission: testSubmission,
  canStartOver: true,
  canOpenParticipant: false,
});

describe("testCornerFor", () => {
  const pages = {
    "test submission": {
      isRespondentTestMode: false,
      submission: testSubmission,
    },
    "test mode": { isRespondentTestMode: true, submission: undefined },
    real: { isRespondentTestMode: false, submission: submission() },
  } as const;
  const progress = {
    "in progress": false,
    completed: true,
  } as const;

  const viewers = ["tester", "other viewer"] as const;
  const expected = {
    tester: {
      "test submission": "inspector",
      "test mode": "inspector",
      real: "none",
    },
    "other viewer": {
      "test submission": "notice",
      "test mode": "notice",
      real: "none",
    },
  } as const;
  const rows = viewers.flatMap((viewer) =>
    (Object.keys(pages) as (keyof typeof pages)[]).flatMap((page) =>
      (Object.keys(progress) as (keyof typeof progress)[]).map((phase) => ({
        viewer,
        page,
        phase,
        corner: expected[viewer][page],
      })),
    ),
  );

  // The corner never depends on the phase: completed pages keep it, with no model.
  it.each(rows)("a $viewer on a $page page, $phase: $corner", (row) => {
    const { isRespondentTestMode, submission: loaded } = pages[row.page];
    expect(
      testCornerFor({
        isRespondentTestMode,
        submission: loaded && { ...loaded, isComplete: progress[row.phase] },
        testInspector: row.viewer === "tester" ? view : null,
      }),
    ).toBe(row.corner);
  });
});

describe("canStartOverTestSubmission", () => {
  it("applies to a person's test submission from the cookie", () => {
    expect(canStartOverTestSubmission({ submission: testSubmission })).toBe(
      true,
    );
  });

  it.each([
    PersonalizationSource.Link,
    PersonalizationSource.OnBehalf,
    undefined,
  ])("does not apply to a %s personalization", (source) => {
    const other = submission({
      isTestSubmission: true,
      personalization: { ...testSubmission.personalization!, source },
    });

    expect(canStartOverTestSubmission({ submission: other })).toBe(false);
  });

  it("does not apply on a URL-token page, which ignores the cookie", () => {
    expect(
      canStartOverTestSubmission({
        submission: testSubmission,
        urlToken: "access-token",
      }),
    ).toBe(false);
  });

  it("does not apply before the submission has an id", () => {
    expect(
      canStartOverTestSubmission({
        submission: { ...testSubmission, id: "" },
      }),
    ).toBe(false);
  });
});

describe("testWriteToken", () => {
  it("saves a person's test submission with its own token, not the form cookie", () => {
    expect(testWriteToken({ submission: testSubmission })).toBe("t");
  });

  it("leaves every other page on the cookie or its URL token", () => {
    expect(
      testWriteToken({ submission: submission({ isTestSubmission: true }) }),
    ).toBeUndefined();
    expect(
      testWriteToken({ submission: testSubmission, urlToken: "access" }),
    ).toBeUndefined();
  });
});
