import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Submissions } from "../submissions";

describe("Submissions.delete", () => {
  it("calls DELETE forms/{formId}/submissions/{submissionId}", async () => {
    const del = vi.fn().mockResolvedValue(ApiResult.success("ok"));
    const endatix = { delete: del } as unknown as EndatixApi;
    const submissions = new Submissions(endatix);

    await submissions.delete("1525035735390879744", "1526934587983265792");

    expect(del).toHaveBeenCalledWith(
      "/forms/1525035735390879744/submissions/1526934587983265792",
    );
  });

  it("returns validation error for invalid ids without calling API", async () => {
    const del = vi.fn();
    const endatix = { delete: del } as unknown as EndatixApi;
    const submissions = new Submissions(endatix);

    const result = await submissions.delete("bad", "1526934587983265792");

    expect(del).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("returns validation error for invalid submissionId without calling API", async () => {
    const del = vi.fn();
    const endatix = { delete: del } as unknown as EndatixApi;
    const submissions = new Submissions(endatix);

    const result = await submissions.delete("1525035735390879744", "bad");

    expect(del).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
