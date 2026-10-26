import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudienceIdentifierKind,
  type AudienceSettings,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  loadAudienceVariables,
  loadDesignerAudience,
  type AudienceVariablesRequest,
} from "../load-audience-variables.server";

const personalizationFlag = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feature-flags", () => ({
  personalizationFlag: () => personalizationFlag(),
}));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn(), warn: vi.fn() },
}));

const VARIABLES: AudienceVariables = {
  variablePresets: {
    definition: { elements: [{ type: "text", name: "tier" }] },
    presets: [{ name: "maria@acme.test", variables: { tier: "gold" } }],
    totalPresets: 1,
  },
  coverage: { participants: { test: 1, real: 0 }, properties: [] },
  editing: { allowAdd: false, allowEdit: false, allowDelete: false },
  readOnlyPresets: [],
};

function apiWith(variables: ApiResult<AudienceVariables>) {
  const getVariables = vi.fn().mockResolvedValue(variables);
  return {
    api: { audience: { getVariables } } as unknown as EndatixApi,
    getVariables,
  };
}

type CheckPermission = AudienceVariablesRequest["checkPermission"];

const allowed: CheckPermission = async () =>
  ({ success: true }) as Awaited<ReturnType<CheckPermission>>;

const INLINE_LIMITS = {
  maxRows: 5_000,
  maxBytes: 20 * 1024 * 1024,
  runsInBackground: false,
};

describe("loadAudienceVariables", () => {
  beforeEach(() => {
    personalizationFlag.mockResolvedValue(true);
  });

  it("loads the form's variables for an editor", async () => {
    const { api } = apiWith(ApiResult.success(VARIABLES));

    const result = await loadAudienceVariables({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    expect(result).toEqual(VARIABLES);
  });

  it("reads nothing with the flag off", async () => {
    personalizationFlag.mockResolvedValue(false);
    const { api, getVariables } = apiWith(ApiResult.success(VARIABLES));

    const result = await loadAudienceVariables({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    expect(result).toBeNull();
    expect(getVariables).not.toHaveBeenCalled();
  });

  it("reads nothing for a reader who cannot edit the form", async () => {
    const { api, getVariables } = apiWith(ApiResult.success(VARIABLES));

    const result = await loadAudienceVariables({
      api,
      formId: "1",
      checkPermission: async () =>
        ({ success: false }) as Awaited<ReturnType<CheckPermission>>,
    });

    expect(result).toBeNull();
    expect(getVariables).not.toHaveBeenCalled();
  });

  it("opens the designer without Preview as when the read fails", async () => {
    const { api } = apiWith(ApiResult.serverError("boom"));

    const result = await loadAudienceVariables({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    expect(result).toBeNull();
  });
});

describe("loadDesignerAudience", () => {
  beforeEach(() => {
    personalizationFlag.mockResolvedValue(true);
  });

  function apiWithSettings(settings: ApiResult<AudienceSettings>) {
    const getVariables = vi
      .fn()
      .mockResolvedValue(ApiResult.success(VARIABLES));
    const getSettings = vi.fn().mockResolvedValue(settings);
    return {
      api: { audience: { getVariables, getSettings } } as unknown as EndatixApi,
      getSettings,
    };
  }

  it("reads the tenant's match key with the variables, so the save matches as the API does", async () => {
    // Arrange
    const { api } = apiWithSettings(
      ApiResult.success({
        identifierKind: AudienceIdentifierKind.ExternalId,
        isLocked: true,
        importLimits: INLINE_LIMITS,
      }),
    );

    // Act
    const result = await loadDesignerAudience({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    // Assert
    expect(result).toEqual({
      variables: VARIABLES,
      identifierKind: AudienceIdentifierKind.ExternalId,
    });
  });

  it("keeps Preview as without saving when the match key cannot be read", async () => {
    // Arrange
    const { api } = apiWithSettings(ApiResult.serverError("boom"));

    // Act
    const result = await loadDesignerAudience({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    // Assert
    expect(result).toEqual({ variables: VARIABLES, identifierKind: null });
  });

  it("reads no match key when there are no variables", async () => {
    // Arrange
    personalizationFlag.mockResolvedValue(false);
    const { api, getSettings } = apiWithSettings(
      ApiResult.success({
        identifierKind: AudienceIdentifierKind.Email,
        isLocked: false,
        importLimits: INLINE_LIMITS,
      }),
    );

    // Act
    const result = await loadDesignerAudience({
      api,
      formId: "1",
      checkPermission: allowed,
    });

    // Assert
    expect(result).toBeNull();
    expect(getSettings).not.toHaveBeenCalled();
  });
});
