import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { releaseE2eForms } from "../../e2e/utils/e2e-form-release";

const KEPT_PATH = path.join(process.cwd(), "e2e/.screen-out-kept.json");
const IDS = ["rel-delete-a", "rel-delete-b", "rel-keep"];

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

function forgetKept(ids: readonly string[]): void {
  let rows: { formId: string }[] = [];
  try {
    rows = JSON.parse(readFileSync(KEPT_PATH, "utf8")) as { formId: string }[];
  } catch {
    return;
  }
  const remaining = rows.filter((row) => !ids.includes(row.formId));
  if (remaining.length === 0) {
    unlinkSync(KEPT_PATH);
    return;
  }
  writeFileSync(KEPT_PATH, JSON.stringify(remaining, null, 2));
}

describe("releaseE2eForms", () => {
  afterEach(() => {
    forgetKept(IDS);
  });

  it("deletes each form and does not record the ids", async () => {
    // Arrange
    const deleteForm = vi.fn().mockResolvedValue(ApiResult.success(undefined));
    const api = { forms: { delete: deleteForm } } as unknown as EndatixApi;

    // Act
    const outcome = await releaseE2eForms(
      api,
      ["rel-delete-a", "rel-delete-b"],
      false,
    );

    // Assert
    expect(outcome).toBe("deleted");
    expect(deleteForm).toHaveBeenCalledWith("rel-delete-a");
    expect(deleteForm).toHaveBeenCalledWith("rel-delete-b");
    expect(keptIds()).not.toContain("rel-delete-a");
    expect(keptIds()).not.toContain("rel-delete-b");
  });

  it("records each form id and does not delete when keeping", async () => {
    // Arrange
    const deleteForm = vi.fn();
    const api = { forms: { delete: deleteForm } } as unknown as EndatixApi;

    // Act
    const outcome = await releaseE2eForms(api, ["rel-keep"], true);

    // Assert
    expect(outcome).toBe("kept");
    expect(deleteForm).not.toHaveBeenCalled();
    expect(keptIds()).toContain("rel-keep");
  });
});
