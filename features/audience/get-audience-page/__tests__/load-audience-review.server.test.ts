import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { loadAudienceReview } from "../load-audience-review.server";

vi.mock("server-only", () => ({}));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn(), warn: vi.fn() },
}));

const VARIABLES = {
  variablePresets: null,
  coverage: { participants: { test: 0, real: 0 }, properties: [] },
  editing: { allowAdd: false, allowEdit: false, allowDelete: false },
} satisfies AudienceVariables;
const SAVED = { elements: [{ type: "text", name: "q", title: "{tier}" }] };

function apiWith(definition: ApiResult<unknown>) {
  const get = vi.fn().mockResolvedValue(definition);
  const getVariables = vi.fn().mockResolvedValue(ApiResult.success(VARIABLES));
  const api = {
    definitions: { get },
    audience: { getVariables },
  } as unknown as EndatixApi;
  return { api, get, getVariables };
}

describe("loadAudienceReview", () => {
  it("reads the saved definition and the form's variables", async () => {
    const { api, get } = apiWith(
      ApiResult.success({ jsonData: JSON.stringify(SAVED) }),
    );

    const result = await loadAudienceReview({
      api,
      formId: "1",
      activeDefinitionId: "5",
    });

    expect(get).toHaveBeenCalledWith("1", "5");
    expect(result).toEqual({ surveyJson: SAVED, variables: VARIABLES });
  });

  it("has nothing to review for a form never saved", async () => {
    const { api, getVariables } = apiWith(ApiResult.success({}));

    const result = await loadAudienceReview({ api, formId: "1" });

    expect(result).toBeNull();
    expect(getVariables).not.toHaveBeenCalled();
  });

  it("leaves coverage out when a read fails or the definition is not JSON", async () => {
    const failed = apiWith(ApiResult.serverError("boom"));
    const garbled = apiWith(ApiResult.success({ jsonData: "{not json" }));

    const request = { formId: "1", activeDefinitionId: "5" };
    expect(
      await loadAudienceReview({ api: failed.api, ...request }),
    ).toBeNull();
    expect(
      await loadAudienceReview({ api: garbled.api, ...request }),
    ).toBeNull();
  });
});
