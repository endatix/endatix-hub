import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  hydrateBrowserEndatixConfig,
  resetBrowserEndatixConfigForTests,
} from "@/features/config/client-endatix-config";
import {
  clearDataListDisplayValuesCacheForTests,
  resolveDataListDisplayValues,
} from "../resolve-data-list-display-values";

const { createEndatixPublicApiMock, getDisplayValuesMock } = vi.hoisted(() => ({
  createEndatixPublicApiMock: vi.fn(),
  getDisplayValuesMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: (options?: unknown) =>
    createEndatixPublicApiMock(options),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

const runtimeDeps = {
  getRuntimeState: () => ({
    formId: "101",
  }),
};

describe("resolveDataListDisplayValues", () => {
  beforeEach(() => {
    hydrateBrowserEndatixConfig({
      apiBaseUrl: "https://api.example.com/api",
      extensionsEnabled: true,
    });
    clearDataListDisplayValuesCacheForTests();
    createEndatixPublicApiMock.mockReset();
    createEndatixPublicApiMock.mockReturnValue({
      dataLists: {
        getDisplayValues: getDisplayValuesMock,
      },
    });
    getDisplayValuesMock.mockReset();
    getDisplayValuesMock.mockResolvedValue(
      ApiResult.success([
        {
          value: "728193",
          labels: { default: "Plovdiv", bg: "Пловдив" },
        },
      ]),
    );
  });

  afterEach(() => {
    resetBrowserEndatixConfigForTests();
  });

  it("requests includeLocales and returns full label maps", async () => {
    const result = await resolveDataListDisplayValues(
      runtimeDeps,
      "42",
      ["728193"],
      { locale: "bg", includeLocales: ["default", "bg"] },
    );

    expect(createEndatixPublicApiMock).toHaveBeenCalledWith({
      baseUrl: "https://api.example.com/api",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.get("728193")).toEqual({
        default: "Plovdiv",
        bg: "Пловдив",
      });
    }
    expect(getDisplayValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeLocales: ["default", "bg"],
        locale: "bg",
        values: ["728193"],
      }),
    );
  });

  it("reuses cached labels without another network call", async () => {
    await resolveDataListDisplayValues(runtimeDeps, "42", ["728193"], {
      includeLocales: ["default", "bg"],
    });

    const second = await resolveDataListDisplayValues(
      runtimeDeps,
      "42",
      ["728193"],
      { includeLocales: ["default", "bg"] },
    );

    expect(getDisplayValuesMock).toHaveBeenCalledTimes(1);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.data.get("728193")).toEqual({
        default: "Plovdiv",
        bg: "Пловдив",
      });
    }
  });

  it("re-fetches when cached labels miss a requested locale", async () => {
    getDisplayValuesMock
      .mockResolvedValueOnce(
        ApiResult.success([
          {
            value: "728193",
            labels: { default: "Plovdiv" },
          },
        ]),
      )
      .mockResolvedValueOnce(
        ApiResult.success([
          {
            value: "728193",
            labels: { default: "Plovdiv", bg: "Пловдив" },
          },
        ]),
      );

    await resolveDataListDisplayValues(runtimeDeps, "42", ["728193"], {
      includeLocales: ["default"],
    });

    const second = await resolveDataListDisplayValues(
      runtimeDeps,
      "42",
      ["728193"],
      { includeLocales: ["default", "bg"] },
    );

    expect(getDisplayValuesMock).toHaveBeenCalledTimes(2);
    expect(getDisplayValuesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        includeLocales: ["default", "bg"],
        values: ["728193"],
      }),
    );
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.data.get("728193")).toEqual({
        default: "Plovdiv",
        bg: "Пловдив",
      });
    }
  });
});
