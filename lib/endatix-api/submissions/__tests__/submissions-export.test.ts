import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Submissions } from "../submissions";

describe("Submissions.export", () => {
  it("sends exportFormatId as a string to preserve snowflake ids", async () => {
    const snowflakeExportFormatId = "1526934587983265792";
    const postStream = vi
      .fn()
      .mockResolvedValue(ApiResult.success(new Response()));
    const endatix = { postStream } as unknown as EndatixApi;
    const submissions = new Submissions(endatix);

    await submissions.export({
      formId: "1525035735390879744",
      exportFormat: "codebook-shoji",
      exportFormatId: snowflakeExportFormatId,
    });

    expect(postStream).toHaveBeenCalledWith(
      "/forms/1525035735390879744/submissions/export",
      expect.objectContaining({
        exportFormat: "codebook-shoji",
        exportFormatId: snowflakeExportFormatId,
      }),
    );
    expect(Number(snowflakeExportFormatId).toString()).not.toBe(
      snowflakeExportFormatId,
    );
  });
});
