import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import {
  loadPreviewAs,
  type PreviewAsRequest,
} from "../load-preview-as.server";

vi.mock("server-only", () => ({}));
vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn(), warn: vi.fn() },
}));

const property = (id: string, variableName: string): AudienceProperty => ({
  id,
  formId: "1",
  variableName,
  name: variableName,
  dataType: AudienceDataType.Text,
  sortOrder: 0,
  allowsOther: false,
});

const person = (
  memberId: string,
  identifier: string,
  isTest: boolean,
): AudiencePerson => ({
  membershipId: `9${memberId}`,
  audienceMemberId: memberId,
  identifier,
  values: {},
  isTest,
  link: { status: "none" },
});

const MARIA = person("7", "maria@acme.test", true);
const JO = person("8", "jo@acme.test", true);
const REAL = person("20", "sam@acme.com", false);

const FORM_JSON = { elements: [{ type: "text", name: "plan" }] };

const VARIABLES: AudienceVariables = {
  variablePresets: {
    definition: {
      elements: [
        { type: "text", name: "tier" },
        { type: "text", name: "region" },
      ],
    },
    presets: [],
    totalPresets: 2,
  },
  coverage: { participants: { test: 2, real: 1 }, properties: [] },
  editing: { allowAdd: true, allowEdit: true, allowDelete: false },
};

const page = (items: AudiencePerson[]) =>
  ApiResult.success({
    items,
    page: 1,
    pageSize: 50,
    totalRecords: items.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

type Overrides = {
  variables?: AudienceVariables;
  participantVariables?: ApiResult<unknown>;
  participant?: ApiResult<unknown>;
};

function apiWith(overrides: Overrides = {}) {
  const audience = {
    getSettings: vi.fn().mockResolvedValue(
      ApiResult.success({
        identifierKind: AudienceIdentifierKind.Email,
        isLocked: true,
      }),
    ),
    listProperties: vi
      .fn()
      .mockResolvedValue(
        ApiResult.success([property("10", "email"), property("11", "tier")]),
      ),
    getVariables: vi
      .fn()
      .mockResolvedValue(ApiResult.success(overrides.variables ?? VARIABLES)),
    listPeople: vi.fn((_formId: string, request: { search?: string }) =>
      Promise.resolve(request.search ? page([REAL, MARIA]) : page([MARIA, JO])),
    ),
    getParticipant: vi
      .fn()
      .mockImplementation((_formId: string, memberId: string) =>
        Promise.resolve(
          overrides.participant ??
            ApiResult.success(
              [MARIA, JO, REAL].find((p) => p.audienceMemberId === memberId),
            ),
        ),
      ),
    getParticipantVariables: vi.fn().mockResolvedValue(
      overrides.participantVariables ??
        ApiResult.success({
          name: "maria@acme.test",
          variables: { tier: "gold", region: null },
        }),
    ),
  };
  const definitions = {
    get: vi.fn().mockResolvedValue(
      ApiResult.success({
        id: "55",
        formId: "1",
        isDraft: false,
        jsonData: JSON.stringify(FORM_JSON),
        createdAt: "2026-10-20T08:00:00Z",
        modifiedAt: "2026-10-23T14:30:00Z",
      }),
    ),
  };
  return { audience, definitions } as unknown as EndatixApi & {
    audience: typeof audience;
    definitions: typeof definitions;
  };
}

const request = (
  api: EndatixApi,
  extra: Partial<PreviewAsRequest> = {},
): PreviewAsRequest => ({
  api,
  formId: "1",
  activeDefinitionId: "55",
  canTest: true,
  ...extra,
});

async function load(api: EndatixApi, extra: Partial<PreviewAsRequest> = {}) {
  const result = await loadPreviewAs(request(api, extra));
  if (Result.isError(result)) throw new Error(result.message);
  return result.value;
}

describe("loadPreviewAs", () => {
  it("lists the Test participants and previews the first one on the saved form", async () => {
    const api = apiWith();

    const data = await load(api);

    expect(api.audience.listPeople).toHaveBeenCalledWith("1", {
      test: AudiencePeopleTestFilter.Test,
      page: 1,
      pageSize: 50,
    });
    expect(data.testParticipants).toEqual([MARIA, JO]);
    expect(data.matches).toBeNull();
    expect(data.form).toEqual({
      definition: FORM_JSON,
      savedAt: "2026-10-23T14:30:00Z",
    });
    expect(api.audience.getParticipantVariables).toHaveBeenCalledWith("1", "7");
    expect(data.selected).toEqual({
      status: "found",
      person: MARIA,
      variables: { tier: "gold", region: null },
    });
  });

  it("searches everyone on the form, real participants included", async () => {
    const api = apiWith();

    const data = await load(api, { search: "acme" });

    expect(api.audience.listPeople).toHaveBeenCalledWith("1", {
      search: "acme",
      page: 1,
      pageSize: 50,
    });
    expect(data.search).toBe("acme");
    expect(data.matches).toEqual([REAL, MARIA]);
  });

  it("previews the participant the link names", async () => {
    const api = apiWith();

    const data = await load(api, { memberId: "20" });

    expect(api.audience.getParticipant).toHaveBeenCalledWith("1", "20");
    expect(api.audience.getParticipantVariables).toHaveBeenCalledWith(
      "1",
      "20",
    );
    expect(data.selected).toMatchObject({ status: "found", person: REAL });
  });

  it("says so when the participant the link names is no longer on the form", async () => {
    const notFound = ApiResult.notFoundError("Not on this form.");
    const api = apiWith({
      participant: notFound,
      participantVariables: notFound,
    });

    const data = await load(api, { memberId: "99" });

    expect(data.selected).toEqual({ status: "gone" });
  });

  it("keeps only value properties for Edit values", async () => {
    const data = await load(apiWith());

    expect(data.properties).toEqual([property("11", "tier")]);
    expect(data.identifierKind).toBe(AudienceIdentifierKind.Email);
  });

  it("previews nobody on a form with no Properties", async () => {
    const api = apiWith({ variables: { ...VARIABLES, variablePresets: null } });

    const data = await load(api);

    expect(data.hasVariables).toBe(false);
    expect(data.selected).toBeNull();
    expect(api.audience.getParticipantVariables).not.toHaveBeenCalled();
  });

  it("has no form to show before the first save", async () => {
    const api = apiWith();

    const data = await load(api, { activeDefinitionId: undefined });

    expect(data.form).toBeNull();
    expect(api.definitions.get).not.toHaveBeenCalled();
  });
});
