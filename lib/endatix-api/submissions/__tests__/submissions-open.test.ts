import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Submissions } from "../submissions";

const FORM_ID = "1525035735390879744";

describe("Submissions.public.open", () => {
  it("POSTs forms/{formId}/submissions/open with the token, without auth", async () => {
    // Arrange
    const post = vi.fn().mockResolvedValue(ApiResult.success({ id: "1" }));
    const submissions = new Submissions({ post } as unknown as EndatixApi);

    // Act
    await submissions.public.open(FORM_ID, { accessToken: "a.b.c.d" });

    // Assert
    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/submissions/open`,
      { accessToken: "a.b.c.d" },
      { requireAuth: false },
    );
  });

  it("returns a validation error for an invalid form id without calling the API", async () => {
    // Arrange
    const post = vi.fn();
    const submissions = new Submissions({ post } as unknown as EndatixApi);

    // Act
    const result = await submissions.public.open("bad", {});

    // Assert
    expect(post).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
