import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  hydrateBrowserEndatixConfig,
  resetBrowserEndatixConfigForTests,
} from "@/features/config/client-endatix-config";
import { searchDataListChoices } from "../search-data-list-choices";

const { createEndatixPublicApiMock, searchMock } = vi.hoisted(() => ({
  createEndatixPublicApiMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: (options?: unknown) =>
    createEndatixPublicApiMock(options),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

describe("searchDataListChoices", () => {
  const runtimeDeps = {
    getRuntimeState: () => ({
      formId: "101",
    }),
  };

  beforeEach(() => {
    hydrateBrowserEndatixConfig({
      apiBaseUrl: "https://api.example.com/api",
      extensionsEnabled: true,
    });
    createEndatixPublicApiMock.mockReset();
    createEndatixPublicApiMock.mockReturnValue({
      dataLists: {
        search: searchMock,
      },
    });
    searchMock.mockReset();
    searchMock.mockResolvedValue(
      ApiResult.success({
        page: 1,
        pageSize: 25,
        totalRecords: 1,
        totalPages: 1,
        items: [
          {
            value: "728193",
            labels: { default: "Plovdiv", bg: "Пловдив" },
          },
        ],
      }),
    );
  });

  afterEach(() => {
    resetBrowserEndatixConfigForTests();
  });

  it("creates the public client with apiBaseUrl from hydrated client config", async () => {
    const result = await searchDataListChoices(runtimeDeps, "42", {
      skip: 0,
      take: 25,
      filter: "plo",
      searchMode: "contains",
    });

    expect(createEndatixPublicApiMock).toHaveBeenCalledWith({
      baseUrl: "https://api.example.com/api",
    });
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "101",
        dataListId: "42",
        formAccessJwt: "test-form-access-jwt",
        query: "plo",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([
        {
          value: "728193",
          text: { default: "Plovdiv", bg: "Пловдив" },
        },
      ]);
      expect(result.data.total).toBe(1);
    }
  });
});
