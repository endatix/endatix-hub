import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  clearDataListDisplayValuesCacheForTests,
  resolveDataListDisplayValues,
} from "../resolve-data-list-display-values";

const { getDisplayValuesMock } = vi.hoisted(() => ({
  getDisplayValuesMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: () => ({
    dataLists: {
      getDisplayValues: getDisplayValuesMock,
    },
  }),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

describe("resolveDataListDisplayValues", () => {
  beforeEach(() => {
    clearDataListDisplayValuesCacheForTests();
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

  it("requests includeLocales and returns full label maps", async () => {
    const result = await resolveDataListDisplayValues(
      { getRuntimeState: () => ({ formId: "101" }) },
      "42",
      ["728193"],
      { locale: "bg", includeLocales: ["default", "bg"] },
    );

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
    await resolveDataListDisplayValues(
      { getRuntimeState: () => ({ formId: "101" }) },
      "42",
      ["728193"],
      { includeLocales: ["default", "bg"] },
    );

    const second = await resolveDataListDisplayValues(
      { getRuntimeState: () => ({ formId: "101" }) },
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
});
