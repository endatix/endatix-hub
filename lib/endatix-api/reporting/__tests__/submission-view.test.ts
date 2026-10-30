import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import {
  buildSubmissionViewEndpoint,
  SubmissionViews,
} from "../submission-view";

const VIEW = {
  version: "2",
  settings: { v: 1 as const, columns: [{ key: "q1", width: 200 }] },
};

describe("SubmissionViews", () => {
  it("reads the form's view", async () => {
    // Arrange
    const get = vi.fn().mockResolvedValue(ApiResult.success(VIEW));
    const views = new SubmissionViews({ get } as unknown as EndatixApi);

    // Act
    const result = await views.get("5");

    // Assert
    expect(get).toHaveBeenCalledWith("/forms/5/reporting/submission-view");
    expect(result).toEqual(ApiResult.success(VIEW));
  });

  it("saves with the version it read", async () => {
    // Arrange
    const put = vi.fn().mockResolvedValue(ApiResult.success(VIEW));
    const views = new SubmissionViews({ put } as unknown as EndatixApi);

    // Act
    await views.save("5", VIEW);

    // Assert
    expect(put).toHaveBeenCalledWith(buildSubmissionViewEndpoint("5"), {
      version: "2",
      settings: VIEW.settings,
    });
  });

  it("refuses an invalid form id without calling the API", async () => {
    // Arrange
    const put = vi.fn();
    const views = new SubmissionViews({ put } as unknown as EndatixApi);

    // Act
    const result = await views.save("../x", VIEW);

    // Assert
    expect(put).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
