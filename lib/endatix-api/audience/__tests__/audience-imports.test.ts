import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience } from "../audience";
import { AudienceIdentifierKind } from "../types";

const FORM_ID = "1525035735390879744";
const IMPORT_ID = "1526934587983265792";
const IMPORTS = `/forms/${FORM_ID}/audience/imports`;

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

const WIRE_VIEW = {
  importId: "1526934587983265792",
  status: "uploading",
  fileName: "panel.csv",
  isTest: false,
  upload: { rowCount: 2_500, chunkSize: 1_000, missingChunks: [0, 1, 2] },
  runsInBackground: true,
  checkedRowCount: 0,
  check: null,
  written: {
    writtenRowCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    rejectedCount: 0,
  },
  rejections: [],
  failure: null,
  canResume: false,
  jobId: null,
  createdAt: "2026-10-26T10:00:00Z",
  finishedAt: null,
};

const success = (data: unknown) =>
  vi.fn().mockResolvedValue(ApiResult.success(data));

describe("Audience settings import limits", () => {
  it("reads the host's import limits", async () => {
    const limits = {
      maxRows: 100_000,
      maxBytes: 52_428_800,
      runsInBackground: true,
    };
    const get = success({
      identifierKind: AudienceIdentifierKind.Email,
      isLocked: false,
      importLimits: limits,
    });

    const result = await audienceWith({ get }).getSettings();

    expect(result.success && result.data.importLimits).toEqual(limits);
  });

  it("falls back to the inline limits when the API does not send them", async () => {
    const get = success({
      identifierKind: AudienceIdentifierKind.Email,
      isLocked: false,
    });

    const result = await audienceWith({ get }).getSettings();

    expect(result.success && result.data.importLimits).toEqual({
      maxRows: 5_000,
      maxBytes: 20_971_520,
      runsInBackground: false,
    });
  });
});

describe("Audience staged imports", () => {
  it("starts an import with the file's headers and mapping", async () => {
    const post = success({ ...WIRE_VIEW, importId: 42 });
    const body = {
      fileName: "panel.csv",
      headers: ["email", "age"],
      rowCount: 2_500,
      identifierColumn: "email",
      propertyColumns: { age: "age" },
      isTest: false,
    };

    const result = await audienceWith({ post }).startImport(FORM_ID, body);

    expect(post).toHaveBeenCalledWith(IMPORTS, body);
    expect(result.success && result.data).toMatchObject({
      importId: "42",
      upload: { chunkSize: 1_000, missingChunks: [0, 1, 2] },
    });
  });

  it("sends one chunk by its index", async () => {
    const put = success(WIRE_VIEW);
    const chunk = {
      firstRowNumber: 1_002,
      rows: [{ cells: ["a@b.co", "40"], malformed: false }],
    };

    await audienceWith({ put }).sendImportChunk(FORM_ID, IMPORT_ID, {
      index: 1,
      ...chunk,
    });

    expect(put).toHaveBeenCalledWith(`${IMPORTS}/${IMPORT_ID}/chunks/1`, chunk);
  });

  it("reads one import, or the form's current one", async () => {
    const get = success(WIRE_VIEW);
    const audience = audienceWith({ get });

    await audience.getImport(FORM_ID, IMPORT_ID);
    await audience.getImport(FORM_ID, "current");

    expect(get).toHaveBeenNthCalledWith(1, `${IMPORTS}/${IMPORT_ID}`);
    expect(get).toHaveBeenNthCalledWith(2, `${IMPORTS}/current`);
  });

  it("moves an import to writing or canceled", async () => {
    const patch = success({ ...WIRE_VIEW, status: "canceled" });

    const result = await audienceWith({ patch }).moveImport(
      FORM_ID,
      IMPORT_ID,
      "canceled",
    );

    expect(patch).toHaveBeenCalledWith(`${IMPORTS}/${IMPORT_ID}`, {
      status: "canceled",
    });
    expect(result.success && result.data.status).toBe("canceled");
  });

  it("refuses an import id that is not an Endatix id without calling the API", async () => {
    const get = vi.fn();

    const result = await audienceWith({ get }).getImport(FORM_ID, "../people");

    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
