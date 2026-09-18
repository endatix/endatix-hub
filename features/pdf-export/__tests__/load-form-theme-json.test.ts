import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";

const getActive = vi.fn();

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    definitions = { getActive };
  },
}));

const { loadFormThemeJson } = await import("../load-form-theme-json");

beforeEach(() => {
  getActive.mockReset();
});

describe("loadFormThemeJson", () => {
  it("returns embedded themeModel without calling the API", async () => {
    const json = await loadFormThemeJson({
      formId: "1",
      embeddedThemeJson: '{"themeName":"sharp"}',
    });

    expect(json).toBe('{"themeName":"sharp"}');
    expect(getActive).not.toHaveBeenCalled();
  });

  it("loads GET /definition when nothing is embedded", async () => {
    getActive.mockResolvedValue(
      ApiResult.success({ themeModel: '{"themeName":"sharp"}' }),
    );

    const json = await loadFormThemeJson({
      formId: "12",
      accessToken: "hub-jwt",
    });

    expect(json).toBe('{"themeName":"sharp"}');
    expect(getActive).toHaveBeenCalledWith("12", { requireAuth: true });
  });

  it("skips auth for anonymous export and returns undefined on failure", async () => {
    getActive.mockResolvedValue(ApiResult.unknownError("down"));

    const json = await loadFormThemeJson({ formId: "12" });

    expect(json).toBeUndefined();
    expect(getActive).toHaveBeenCalledWith("12", { requireAuth: false });
  });
});
