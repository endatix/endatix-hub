import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOnBehalfShare } from "../../e2e/utils/on-behalf-share";

const KEPT_PATH = path.join(process.cwd(), "e2e/.screen-out-kept.json");
const FORM_ID = "tail-form-1";

function keptIds(): string[] {
  try {
    const rows = JSON.parse(readFileSync(KEPT_PATH, "utf8")) as {
      formId: string;
    }[];
    return rows.map((row) => row.formId);
  } catch {
    return [];
  }
}

function forgetKept(formId: string): void {
  let rows: { formId: string }[] = [];
  try {
    rows = JSON.parse(readFileSync(KEPT_PATH, "utf8")) as { formId: string }[];
  } catch {
    return;
  }
  const remaining = rows.filter((row) => row.formId !== formId);
  if (remaining.length === 0) {
    unlinkSync(KEPT_PATH);
    return;
  }
  writeFileSync(KEPT_PATH, JSON.stringify(remaining, null, 2));
}

function apiDouble(onBehalf: ApiResult<{ id: string; token: string }>) {
  const createAccessToken = vi
    .fn()
    .mockResolvedValue(ApiResult.success({ token: "share-token" }));
  const deleteForm = vi.fn().mockResolvedValue(ApiResult.success(undefined));
  const api = {
    post: vi.fn().mockResolvedValue(onBehalf),
    submissions: { createAccessToken },
    forms: { delete: deleteForm },
  } as unknown as EndatixApi;
  return { api, createAccessToken, deleteForm };
}

describe("createOnBehalfShare", () => {
  afterEach(() => {
    forgetKept(FORM_ID);
  });

  it("returns the submission id and share token without keeping the form", async () => {
    // Arrange
    const { api, deleteForm } = apiDouble(
      ApiResult.success({ id: "sub-1", token: "hex-token" }),
    );

    // Act
    const opened = await createOnBehalfShare(api, FORM_ID, "e2e-tail-form-1");

    // Assert
    expect(opened).toEqual({
      submissionId: "sub-1",
      token: "hex-token",
      shareToken: "share-token",
    });
    expect(keptIds()).not.toContain(FORM_ID);
    expect(deleteForm).not.toHaveBeenCalled();
  });

  it("keeps the form and does not request a share token when on-behalf fails", async () => {
    // Arrange
    const { api, createAccessToken, deleteForm } = apiDouble(
      ApiResult.serverError("on-behalf down"),
    );

    // Act
    const opened = createOnBehalfShare(api, FORM_ID, "e2e-tail-form-1");

    // Assert
    await expect(opened).rejects.toThrow(
      "On-behalf create failed: on-behalf down",
    );
    expect(createAccessToken).not.toHaveBeenCalled();
    expect(deleteForm).not.toHaveBeenCalled();
    expect(keptIds()).toContain(FORM_ID);
  });

  it("keeps the form when the share token fails", async () => {
    // Arrange
    const { api, createAccessToken, deleteForm } = apiDouble(
      ApiResult.success({ id: "sub-1", token: "hex-token" }),
    );
    createAccessToken.mockResolvedValue(ApiResult.serverError("token down"));

    // Act
    const opened = createOnBehalfShare(api, FORM_ID, "e2e-tail-form-1");

    // Assert
    await expect(opened).rejects.toThrow(
      "Share access token failed: token down",
    );
    expect(deleteForm).not.toHaveBeenCalled();
    expect(keptIds()).toContain(FORM_ID);
  });
});
