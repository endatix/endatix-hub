import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceParticipant,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { loadParticipantPage } from "../load-participant-page.server";

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

const PARTICIPANT: AudienceParticipant = {
  membershipId: "981",
  audienceMemberId: "7",
  identifier: "tester@example.com",
  values: { "11": "Gold" },
  isTest: true,
  link: { status: "none" },
  submissions: [],
  submissionTotal: 0,
};

function apiWith(participant: ApiResult<AudienceParticipant>) {
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
    getParticipant: vi.fn().mockResolvedValue(participant),
  };
  return { audience } as unknown as EndatixApi;
}

const request = (api: EndatixApi) => ({
  api,
  formId: "1",
  memberId: "7",
  canTest: true,
});

describe("loadParticipantPage", () => {
  it("reads the participant with the form's value properties and match key", async () => {
    const api = apiWith(ApiResult.success(PARTICIPANT));

    const page = await loadParticipantPage(request(api));

    expect(api.audience.getParticipant).toHaveBeenCalledWith("1", "7");
    expect(Result.isSuccess(page) && page.value).toEqual({
      status: "found",
      data: {
        participant: PARTICIPANT,
        identifierKind: AudienceIdentifierKind.Email,
        properties: [property("11", "tier")],
        canTest: true,
      },
    });
  });

  it("says the participant is gone when the API no longer finds them on the form", async () => {
    const api = apiWith(
      ApiResult.notFoundError("Participant not found on this form."),
    );

    const page = await loadParticipantPage(request(api));

    expect(Result.isSuccess(page) && page.value).toEqual({ status: "gone" });
  });

  it("treats a member id that cannot be one as a wrong link, without asking the API", async () => {
    const api = apiWith(ApiResult.success(PARTICIPANT));

    const page = await loadParticipantPage({ ...request(api), memberId: "x" });

    expect(Result.isSuccess(page) && page.value).toEqual({ status: "gone" });
    expect(api.audience.getParticipant).not.toHaveBeenCalled();
  });

  it("keeps any other failure an error for the load-error page", async () => {
    const api = apiWith(ApiResult.serverError("boom"));

    const page = await loadParticipantPage(request(api));

    expect(Result.isError(page)).toBe(true);
  });
});
