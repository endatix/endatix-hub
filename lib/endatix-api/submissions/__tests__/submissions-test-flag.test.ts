import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Submissions } from "../submissions";

const FORM_ID = "1525035735390879744";
const SUBMISSION_ID = "1526934587983265792";

describe("Submissions.setTest", () => {
  it("calls PATCH forms/{formId}/submissions/{submissionId}/test with isTest", async () => {
    // Arrange
    const patch = vi.fn().mockResolvedValue(ApiResult.success({}));
    const submissions = new Submissions({ patch } as unknown as EndatixApi);

    // Act
    await submissions.setTest(FORM_ID, SUBMISSION_ID, true);

    // Assert
    expect(patch).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/submissions/${SUBMISSION_ID}/test`,
      { isTest: true },
    );
  });

  it("returns a validation error for an invalid id without calling the API", async () => {
    // Arrange
    const patch = vi.fn();
    const submissions = new Submissions({ patch } as unknown as EndatixApi);

    // Act
    const result = await submissions.setTest(FORM_ID, "bad", false);

    // Assert
    expect(patch).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe("Submissions.deleteTests", () => {
  it("calls POST forms/{formId}/submissions/test/delete", async () => {
    // Arrange
    const post = vi
      .fn()
      .mockResolvedValue(ApiResult.success({ deletedCount: 3 }));
    const submissions = new Submissions({ post } as unknown as EndatixApi);

    // Act
    const result = await submissions.deleteTests(FORM_ID);

    // Assert
    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/submissions/test/delete`,
      {},
    );
    expect(result).toEqual(ApiResult.success({ deletedCount: 3 }));
  });

  it("returns a validation error for an invalid form id without calling the API", async () => {
    // Arrange
    const post = vi.fn();
    const submissions = new Submissions({ post } as unknown as EndatixApi);

    // Act
    const result = await submissions.deleteTests("bad");

    // Assert
    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
