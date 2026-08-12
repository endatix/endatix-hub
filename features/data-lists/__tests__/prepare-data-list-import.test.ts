import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { DATA_LIST_MAX_LOCALES } from "@/features/data-lists/import-limits";
import { prepareDataListImport } from "../prepare-data-list-import";

const { mockGetById, mockRequireHubAccess, mockAuth } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockRequireHubAccess: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(async () => ({
    requireHubAccess: mockRequireHubAccess,
  })),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/endatix-api")>();
  return {
    ...mod,
    EndatixApi: vi.fn().mockImplementation(function () {
      return {
        dataLists: {
          getById: mockGetById,
        },
      };
    }),
  };
});

const details = {
  id: "42",
  name: "Countries",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  itemsCount: 1,
  availableLocales: ["en"],
  items: [{ id: "1", value: "ch", labels: { default: "Switzerland" } }],
};

const baseInput = {
  dataListId: "42",
  payloadGuard: Result.success(undefined),
  loadDetailsLogMessage: "Failed to load data list before test",
  loggerName: "data-lists.prepareImport.test",
};

const VALID_LOCALES_AT_CAP = [
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "nl",
  "pl",
  "sv",
  "da",
  "fi",
  "cs",
  "hu",
  "ro",
  "bg",
  "el",
  "tr",
  "ja",
  "ko",
  "zh",
  "ar",
] as const;

describe("prepareDataListImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue(ApiResult.success(details));
  });

  it("returns validation error for an invalid data list id", async () => {
    // Arrange / Act
    const result = await prepareDataListImport({
      ...baseInput,
      dataListId: "not-an-id",
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("dataListId");
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("returns error for an invalid ensureLocales culture code", async () => {
    // Arrange / Act
    const result = await prepareDataListImport({
      ...baseInput,
      ensureLocales: ["!!!"],
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("valid culture code");
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("returns the payload guard error before calling getById", async () => {
    // Arrange / Act
    const result = await prepareDataListImport({
      ...baseInput,
      payloadGuard: Result.error("At least one item is required."),
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("At least one item");
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("rejects ensureLocales that alone exceed the catalog cap before getById", async () => {
    // Arrange
    const ensureLocales = [...VALID_LOCALES_AT_CAP, "he"];

    // Act
    const result = await prepareDataListImport({
      ...baseInput,
      ensureLocales,
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain(String(DATA_LIST_MAX_LOCALES));
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("rejects ensureLocales that would exceed the server catalog locale cap", async () => {
    // Arrange
    expect(VALID_LOCALES_AT_CAP).toHaveLength(DATA_LIST_MAX_LOCALES);

    // Act
    const result = await prepareDataListImport({
      ...baseInput,
      ensureLocales: [...VALID_LOCALES_AT_CAP],
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain(String(DATA_LIST_MAX_LOCALES));
    expect(mockGetById).toHaveBeenCalledWith("42");
  });

  it("does not double-count ensureLocales already present in the catalog", async () => {
    // Arrange
    mockGetById.mockResolvedValue(
      ApiResult.success({
        ...details,
        availableLocales: [...VALID_LOCALES_AT_CAP],
      }),
    );

    // Act
    const result = await prepareDataListImport({
      ...baseInput,
      ensureLocales: [" FR ", "DE"],
    });

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value.dataListId).toBe("42");
    expect(result.value.ensureLocales).toEqual(["fr", "de"]);
    expect(result.value.api).toBeDefined();
  });

  it("normalizes ensureLocales and returns a prepared import context", async () => {
    // Arrange / Act
    const result = await prepareDataListImport({
      ...baseInput,
      ensureLocales: [" FR ", "de"],
    });

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value).toEqual(
      expect.objectContaining({
        dataListId: "42",
        ensureLocales: ["fr", "de"],
      }),
    );
    expect(mockGetById).toHaveBeenCalledWith("42");
  });

  it("propagates getById failures", async () => {
    // Arrange
    mockGetById.mockResolvedValue(ApiResult.validationError("Not found"));

    // Act
    const result = await prepareDataListImport(baseInput);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("Not found");
  });

  it("propagates requireHubAccess failures", async () => {
    // Arrange
    mockRequireHubAccess.mockRejectedValue(new Error("NEXT_REDIRECT"));

    // Act & Assert
    await expect(prepareDataListImport(baseInput)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
