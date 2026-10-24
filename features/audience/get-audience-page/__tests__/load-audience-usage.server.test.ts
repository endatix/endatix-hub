import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { loadAudienceUsage } from "../load-audience-usage.server";

vi.mock("server-only", () => ({}));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn(), warn: vi.fn() },
}));

const VARIABLES: AudienceVariables = {
  variablePresets: {
    definition: {
      elements: [
        { type: "text", name: "tier" },
        { type: "text", name: "seats" },
      ],
    },
    presets: [],
    totalPresets: 0,
  },
  coverage: {
    participants: { test: 0, real: 3 },
    properties: [{ variableName: "tier", filledTest: 0, filledReal: 2 }],
  },
  editing: { allowAdd: false, allowEdit: false, allowDelete: false },
};
const SAVED = { elements: [{ type: "text", name: "q", title: "{tier}" }] };

function apiWith(definition: ApiResult<unknown>) {
  const get = vi.fn().mockResolvedValue(definition);
  return { api: { definitions: { get } } as unknown as EndatixApi, get };
}

const request = { formId: "1", activeDefinitionId: "5", variables: VARIABLES };

describe("loadAudienceUsage", () => {
  it("sends the names the saved form reads, not the form", async () => {
    const { api, get } = apiWith(
      ApiResult.success({ jsonData: JSON.stringify(SAVED) }),
    );

    const usage = await loadAudienceUsage({ api, ...request });

    expect(get).toHaveBeenCalledWith("1", "5");
    expect(usage).toEqual({
      variableNames: ["tier", "seats"],
      read: ["tier"],
      coverage: VARIABLES.coverage,
    });
  });

  it("reads nothing for a form never saved, or without variables", async () => {
    const { api, get } = apiWith(ApiResult.success({}));

    expect(
      await loadAudienceUsage({
        api,
        ...request,
        activeDefinitionId: undefined,
      }),
    ).toBeNull();
    expect(
      await loadAudienceUsage({ api, ...request, variables: null }),
    ).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("leaves coverage out when the read fails or the definition is not JSON", async () => {
    const failed = apiWith(ApiResult.serverError("boom"));
    const garbled = apiWith(ApiResult.success({ jsonData: "{not json" }));

    expect(await loadAudienceUsage({ api: failed.api, ...request })).toBeNull();
    expect(
      await loadAudienceUsage({ api: garbled.api, ...request }),
    ).toBeNull();
  });
});
