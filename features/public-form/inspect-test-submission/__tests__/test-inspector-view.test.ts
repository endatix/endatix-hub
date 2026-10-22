import { describe, expect, it } from "vitest";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { toTestInspectorView } from "../test-inspector-view";

const base: Submission = {
  id: "21",
  formId: "form-1",
  formDefinitionId: "definition-1",
  isComplete: false,
  isTestSubmission: true,
  jsonData: "{}",
  currentPage: 0,
  metadata: "{}",
  token: "t",
  createdAt: new Date(),
  modifiedAt: new Date(),
  status: "draft",
};

const personTest: Submission = {
  ...base,
  submitterDisplayId: "Ada Lovelace",
  submitterProfile: { region: "EU", email: "ada@example.com" },
  personalization: {
    identifier: "ada@example.com",
    capturedAt: "2026-10-19T08:00:00Z",
    variables: { tier: "gold", age: 36 },
    source: PersonalizationSource.Test,
    memberId: "7",
  },
};

describe("toTestInspectorView", () => {
  it("maps a submission opened with Test as this person", () => {
    expect(
      toTestInspectorView({
        formId: "form-1",
        submission: personTest,
        canStartOver: true,
        canOpenParticipant: true,
      }),
    ).toEqual({
      formId: "form-1",
      submissionId: "21",
      submitter: {
        identifier: "ada@example.com",
        label: "Ada Lovelace",
        source: PersonalizationSource.Test,
        fields: [
          ["email", "ada@example.com"],
          ["region", "EU"],
        ],
      },
      snapshot: {
        capturedAt: "2026-10-19T08:00:00Z",
        values: [
          { name: "age", value: 36 },
          { name: "tier", value: "gold" },
        ],
      },
      links: {
        submissionDetails: "/forms/form-1/submissions/21",
        participant: {
          label: "Participant",
          href: "/forms/form-1/audience/participants/7",
        },
      },
      canStartOver: true,
    });
  });

  it("has no Snapshot when none was captured, and falls back to the Label", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: { ...base, submitterDisplayId: "Ada Lovelace" },
      canStartOver: false,
      canOpenParticipant: true,
    });

    expect(view.snapshot).toBeNull();
    expect(view.submitter).toEqual({
      identifier: "Ada Lovelace",
      label: "Ada Lovelace",
      source: null,
      fields: [],
    });
  });

  it("links to Submission Details only once the submission has an id", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: undefined,
      canStartOver: false,
      canOpenParticipant: true,
    });

    expect(view.submissionId).toBeNull();
    expect(view.links).toEqual({
      submissionDetails: null,
      participant: {
        label: "Audience",
        href: "/forms/form-1/audience?test=test",
      },
    });
    expect(view.submitter.identifier).toBeNull();
  });

  it("opens Audience filtered to test participants when the Snapshot names no member", () => {
    const { memberId: _, ...withoutMember } = personTest.personalization!;
    const view = toTestInspectorView({
      formId: "form-1",
      submission: { ...personTest, personalization: withoutMember },
      canStartOver: true,
      canOpenParticipant: true,
    });

    expect(view.links.participant).toEqual({
      label: "Audience",
      href: "/forms/form-1/audience?test=test",
    });
  });

  it("opens Audience instead when the tester may not open the participant page", () => {
    const view = toTestInspectorView({
      formId: "form-1",
      submission: personTest,
      canStartOver: true,
      canOpenParticipant: false,
    });

    expect(view.links.participant).toEqual({
      label: "Audience",
      href: "/forms/form-1/audience?test=test",
    });
  });
});
