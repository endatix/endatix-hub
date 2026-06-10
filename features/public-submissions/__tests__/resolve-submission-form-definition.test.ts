import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import type { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { describe, expect, it } from "vitest";

const createdAt = new Date("2026-06-10T12:00:00.000Z");

function createSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "submission-1",
    createdAt,
    formId: "form-1",
    formDefinitionId: "definition-1",
    isComplete: false,
    jsonData: "{}",
    currentPage: 0,
    metadata: "{}",
    token: "submission-token",
    status: "draft",
    formDefinition: {
      id: "definition-1",
      formId: "form-1",
      isActive: true,
      isDraft: false,
      jsonData: '{"pages":[]}',
      createdAt,
      modifiedAt: createdAt,
    },
    ...overrides,
  };
}

describe("resolveSubmissionFormDefinition", () => {
  it("returns the embedded submission form definition", () => {
    const result = resolveSubmissionFormDefinition(createSubmission());

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toMatchObject({
        id: "definition-1",
        formId: "form-1",
        jsonData: '{"pages":[]}',
        isActive: true,
        isDraft: false,
        customQuestions: [],
        requiresReCaptcha: false,
        limitOnePerUser: false,
      });
    }
  });

  it("normalizes missing definition fields from the submission", () => {
    const result = resolveSubmissionFormDefinition(
      createSubmission({
        formDefinition: {
          id: "",
          formId: "",
          jsonData: '{"title":"Snapshot"}',
        } as unknown as Submission["formDefinition"],
      }),
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.id).toBe("definition-1");
      expect(result.value.formId).toBe("form-1");
      expect(result.value.isActive).toBe(true);
      expect(result.value.isDraft).toBe(false);
      expect(result.value.createdAt).toBe(createdAt);
      expect(result.value.modifiedAt).toBe(createdAt);
    }
  });

  it("returns an error when the embedded definition is missing", () => {
    const result = resolveSubmissionFormDefinition(
      createSubmission({ formDefinition: undefined }),
    );

    expect(Result.isError(result)).toBe(true);
  });

  it("returns an error when the embedded definition has no json data", () => {
    const result = resolveSubmissionFormDefinition(
      createSubmission({
        formDefinition: {
          id: "definition-1",
          formId: "form-1",
          isActive: true,
          isDraft: false,
          jsonData: " ",
          createdAt,
          modifiedAt: createdAt,
        },
      }),
    );

    expect(Result.isError(result)).toBe(true);
  });
});
