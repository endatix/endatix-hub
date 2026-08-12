import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { DATA_LIST_MAX_LOCALES } from "@/features/data-lists/import-limits";
import { replaceDataListItemsAction } from "../replace-data-list-items.action";

const { mockReplaceItems, mockRequireHubAccess, mockAuth } = vi.hoisted(() => ({
  mockReplaceItems: vi.fn(),
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
          replaceItems: mockReplaceItems,
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

const validItems: DataListChoiceItem[] = [
  { value: "apple", labels: { default: "Apple" } },
];

describe("replaceDataListItemsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
  });

  it("returns validation error for an invalid data list id", async () => {
    const result = await replaceDataListItemsAction("not-an-id", validItems);

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("dataListId");
    expect(mockReplaceItems).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns error for an invalid ensureLocales culture code", async () => {
    const result = await replaceDataListItemsAction("42", validItems, ["!!!"]);

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("valid culture code");
    expect(mockReplaceItems).not.toHaveBeenCalled();
  });

  it("rejects empty items via import payload guards before calling the API", async () => {
    const result = await replaceDataListItemsAction("42", []);

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("At least one item");
    expect(mockReplaceItems).not.toHaveBeenCalled();
  });

  it("rejects ensureLocales that would exceed the catalog locale cap", async () => {
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

    const result = await replaceDataListItemsAction(
      "42",
      validItems,
      ensureLocales,
      1,
    );

    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain(String(DATA_LIST_MAX_LOCALES));
    expect(mockReplaceItems).not.toHaveBeenCalled();
  });

  it("normalizes locales, replaces items, and revalidates on success", async () => {
    mockReplaceItems.mockResolvedValue(ApiResult.success(details));

    const result = await replaceDataListItemsAction(
      "42",
      validItems,
      [" FR ", "de"],
      1,
    );

    expect(mockReplaceItems).toHaveBeenCalledWith("42", validItems, {
      ensureLocales: ["fr", "de"],
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value.id).toBe("42");
    expect(revalidatePath).toHaveBeenCalledWith("/data-lists/42");
  });

  it("defaults ensureLocales to an empty list when omitted", async () => {
    mockReplaceItems.mockResolvedValue(ApiResult.success(details));

    await replaceDataListItemsAction("42", validItems);

    expect(mockReplaceItems).toHaveBeenCalledWith("42", validItems, {
      ensureLocales: [],
    });
  });

  it("does not revalidate when the API call fails", async () => {
    mockReplaceItems.mockResolvedValue(
      ApiResult.validationError("Replace failed"),
    );

    const result = await replaceDataListItemsAction("42", validItems);

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propagates requireHubAccess failures", async () => {
    mockRequireHubAccess.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      replaceDataListItemsAction("42", validItems),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockReplaceItems).not.toHaveBeenCalled();
  });
});
