import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { DATA_LIST_MAX_LOCALES } from "@/features/data-lists/import-limits";
import {
  addDataListLocaleAction,
  setDataListDefaultLocaleAction,
  uploadTranslationsCsvAction,
} from "../translations-csv.action";

const {
  mockUploadTranslationsCsv,
  mockGetById,
  mockAddLocale,
  mockSetDefaultLocale,
  mockRequireHubAccess,
  mockAuth,
} = vi.hoisted(() => ({
  mockUploadTranslationsCsv: vi.fn(),
  mockGetById: vi.fn(),
  mockAddLocale: vi.fn(),
  mockSetDefaultLocale: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/endatix-api")>();
  return {
    ...mod,
    EndatixApi: vi.fn().mockImplementation(function () {
      return {
        dataLists: {
          getById: mockGetById,
          uploadTranslationsCsv: mockUploadTranslationsCsv,
          addLocale: mockAddLocale,
          setDefaultLocale: mockSetDefaultLocale,
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

const validCsv = "value,default\r\napple,Apple\r\n";

describe("uploadTranslationsCsvAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue(ApiResult.success(details));
  });

  it("returns validation error for an invalid data list id", async () => {
    const result = await uploadTranslationsCsvAction({
      dataListId: "not-an-id",
      csv: validCsv,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("dataListId");
    expect(mockGetById).not.toHaveBeenCalled();
    expect(mockUploadTranslationsCsv).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns error for an invalid ensureLocales culture code", async () => {
    const result = await uploadTranslationsCsvAction({
      dataListId: "42",
      csv: validCsv,
      ensureLocales: ["!!!"],
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("valid culture code");
    expect(mockGetById).not.toHaveBeenCalled();
    expect(mockUploadTranslationsCsv).not.toHaveBeenCalled();
  });

  it("rejects csv that fails import payload guards before calling the API", async () => {
    const result = await uploadTranslationsCsvAction({
      dataListId: "42",
      csv: "value,default\r\n",
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("At least one data row");
    expect(mockGetById).toHaveBeenCalledWith("42");
    expect(mockUploadTranslationsCsv).not.toHaveBeenCalled();
  });

  it("rejects ensureLocales that would exceed the server catalog locale cap", async () => {
    const ensureLocales = [
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
    ];
    expect(ensureLocales).toHaveLength(DATA_LIST_MAX_LOCALES);

    const result = await uploadTranslationsCsvAction({
      dataListId: "42",
      csv: validCsv,
      ensureLocales,
    });

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain(String(DATA_LIST_MAX_LOCALES));
    expect(mockUploadTranslationsCsv).not.toHaveBeenCalled();
  });

  it("normalizes locales, uploads csv, and revalidates on success", async () => {
    mockUploadTranslationsCsv.mockResolvedValue(ApiResult.success(details));

    const result = await uploadTranslationsCsvAction({
      dataListId: "42",
      csv: validCsv,
      ensureLocales: [" FR ", "de"],
    });

    expect(mockUploadTranslationsCsv).toHaveBeenCalledWith("42", validCsv, {
      ensureLocales: ["fr", "de"],
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value.id).toBe("42");
    expect(revalidatePath).toHaveBeenCalledWith("/data-lists/42");
  });

  it("does not revalidate when the API call fails", async () => {
    mockUploadTranslationsCsv.mockResolvedValue(
      ApiResult.validationError("CSV parse failed"),
    );

    const result = await uploadTranslationsCsvAction({
      dataListId: "42",
      csv: validCsv,
    });

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propagates requireHubAccess failures", async () => {
    mockRequireHubAccess.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      uploadTranslationsCsvAction({ dataListId: "42", csv: validCsv }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockUploadTranslationsCsv).not.toHaveBeenCalled();
  });
});

describe("addDataListLocaleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
  });

  it("returns validation error for an invalid data list id", async () => {
    const result = await addDataListLocaleAction("bad-id", "fr");

    expect(Result.isError(result)).toBe(true);
    expect(mockAddLocale).not.toHaveBeenCalled();
  });

  it("returns error for an invalid culture code", async () => {
    const result = await addDataListLocaleAction("42", "!!!");

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("valid culture code");
    expect(mockAddLocale).not.toHaveBeenCalled();
  });

  it("normalizes locale, calls API, and revalidates on success", async () => {
    mockAddLocale.mockResolvedValue(ApiResult.success(details));

    const result = await addDataListLocaleAction("42", " FR ");

    expect(mockAddLocale).toHaveBeenCalledWith("42", "fr");
    expect(Result.isSuccess(result)).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/data-lists/42");
  });

  it("does not revalidate when the API call fails", async () => {
    mockAddLocale.mockResolvedValue(ApiResult.notFoundError("Not found"));

    const result = await addDataListLocaleAction("42", "fr");

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setDataListDefaultLocaleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
  });

  it("returns error for an invalid culture code", async () => {
    const result = await setDataListDefaultLocaleAction("42", "!!!");

    expect(Result.isError(result)).toBe(true);
    expect(mockSetDefaultLocale).not.toHaveBeenCalled();
  });

  it("normalizes locale, calls API, and revalidates on success", async () => {
    mockSetDefaultLocale.mockResolvedValue(ApiResult.success(details));

    const result = await setDataListDefaultLocaleAction("42", " DE ");

    expect(mockSetDefaultLocale).toHaveBeenCalledWith("42", "de");
    expect(Result.isSuccess(result)).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/data-lists/42");
  });

  it("does not revalidate when the API call fails", async () => {
    mockSetDefaultLocale.mockResolvedValue(
      ApiResult.validationError("Locale missing"),
    );

    const result = await setDataListDefaultLocaleAction("42", "fr");

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
