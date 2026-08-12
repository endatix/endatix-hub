import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { DATA_LIST_MAX_LOCALES } from "@/features/data-lists/import-limits";
import { createDataListWithImportAction } from "../create-data-list-with-import.action";

const {
  mockCreate,
  mockReplace,
  mockUploadCsv,
  mockDelete,
  mockTelemetryError,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockReplace: vi.fn(),
  mockUploadCsv: vi.fn(),
  mockDelete: vi.fn(),
  mockTelemetryError: vi.fn(),
}));

vi.mock("@/features/data-lists/create-list/create-data-list.action", () => ({
  createDataListAction: (...args: unknown[]) => mockCreate(...args),
}));

vi.mock(
  "@/features/data-lists/replace-items/replace-data-list-items.action",
  () => ({
    replaceDataListItemsAction: (...args: unknown[]) => mockReplace(...args),
  }),
);

vi.mock(
  "@/features/data-lists/translations/translations-csv.action",
  () => ({
    uploadTranslationsCsvAction: (...args: unknown[]) => mockUploadCsv(...args),
  }),
);

vi.mock("@/features/data-lists/delete-list/delete-data-list.action", () => ({
  deleteDataListAction: (...args: unknown[]) => mockDelete(...args),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: (...args: unknown[]) => mockTelemetryError(...args),
  },
}));

const emptyDetails = {
  id: "99",
  name: "Fruits",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  itemsCount: 0,
  availableLocales: [],
  items: [],
};

const importedDetails = {
  ...emptyDetails,
  itemsCount: 1,
  items: [{ id: "1", value: "apple", labels: { default: "Apple" } }],
};

const validItems: DataListChoiceItem[] = [
  { value: "apple", labels: { default: "Apple" } },
];

const validCsv = "value,default\r\napple,Apple\r\n";

describe("createDataListWithImportAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid csv payloads before creating a list", async () => {
    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "csv",
      csv: "value,default\r\n",
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("At least one data row");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUploadCsv).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects empty json items before creating a list", async () => {
    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "json",
      items: [],
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("At least one item");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("rejects ensureLocales that would exceed the catalog locale cap", async () => {
    const ensureLocales = Array.from(
      { length: DATA_LIST_MAX_LOCALES + 1 },
      (_, index) => `fr-${index}`,
    );

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "json",
      items: validItems,
      ensureLocales,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain(String(DATA_LIST_MAX_LOCALES));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns create failure without calling import or rollback", async () => {
    mockCreate.mockResolvedValue(Result.error("create failed"));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      description: "Seasonal fruit",
      format: "json",
      items: validItems,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      name: "Fruits",
      description: "Seasonal fruit",
    });
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toBe("create failed");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockUploadCsv).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("creates then imports json items and does not roll back on success", async () => {
    mockCreate.mockResolvedValue(Result.success(emptyDetails));
    mockReplace.mockResolvedValue(Result.success(importedDetails));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "json",
      items: validItems,
      ensureLocales: ["fr"],
    });

    expect(mockReplace).toHaveBeenCalledWith("99", validItems, ["fr"]);
    expect(mockUploadCsv).not.toHaveBeenCalled();
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value.id).toBe("99");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("creates then uploads csv and does not roll back on success", async () => {
    mockCreate.mockResolvedValue(Result.success(emptyDetails));
    mockUploadCsv.mockResolvedValue(Result.success(importedDetails));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "csv",
      csv: validCsv,
      ensureLocales: ["de"],
    });

    expect(mockUploadCsv).toHaveBeenCalledWith({
      dataListId: "99",
      csv: validCsv,
      ensureLocales: ["de"],
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(Result.isSuccess(result)).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rolls back the created list when json import fails", async () => {
    mockCreate.mockResolvedValue(Result.success(emptyDetails));
    mockReplace.mockResolvedValue(Result.error("replace failed"));
    mockDelete.mockResolvedValue(Result.success("99"));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "json",
      items: validItems,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toBe("replace failed");
    expect(mockDelete).toHaveBeenCalledWith("99");
    expect(mockTelemetryError).not.toHaveBeenCalled();
  });

  it("rolls back the created list when csv import fails", async () => {
    mockCreate.mockResolvedValue(Result.success(emptyDetails));
    mockUploadCsv.mockResolvedValue(Result.error("csv upload failed"));
    mockDelete.mockResolvedValue(Result.success("99"));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "csv",
      csv: validCsv,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toBe("csv upload failed");
    expect(mockDelete).toHaveBeenCalledWith("99");
  });

  it("returns the import error even when rollback delete throws", async () => {
    mockCreate.mockResolvedValue(Result.success(emptyDetails));
    mockReplace.mockResolvedValue(Result.error("replace failed"));
    mockDelete.mockRejectedValue(new Error("delete boom"));

    const result = await createDataListWithImportAction({
      name: "Fruits",
      format: "json",
      items: validItems,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toBe("replace failed");
    expect(mockDelete).toHaveBeenCalledWith("99");
    expect(mockTelemetryError).toHaveBeenCalledWith(
      "Failed to roll back data list creation after import failure",
      expect.any(Error),
      { dataListId: "99" },
      "data-lists.createWithImport",
    );
  });
});
