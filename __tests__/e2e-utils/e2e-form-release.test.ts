import {
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { releaseE2eForms } from "../../e2e/utils/e2e-form-release";

const KEPT_DIR = mkdtempSync(path.join(os.tmpdir(), "e2e-form-release-kept-"));
const KEPT_PATH = path.join(KEPT_DIR, "kept.json");
const PREVIOUS_LEDGER = process.env.E2E_KEPT_FORMS_PATH;
process.env.E2E_KEPT_FORMS_PATH = KEPT_PATH;
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

  afterAll(() => {
    if (PREVIOUS_LEDGER === undefined) {
      delete process.env.E2E_KEPT_FORMS_PATH;
    } else {
      process.env.E2E_KEPT_FORMS_PATH = PREVIOUS_LEDGER;
    }
    rmSync(KEPT_DIR, { recursive: true, force: true });
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
