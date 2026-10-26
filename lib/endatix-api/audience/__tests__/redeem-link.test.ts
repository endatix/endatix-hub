import { describe, expect, it } from "vitest";
import { ApiResult } from "../../shared/api-result";
import { mapRedeemedLinkResult } from "../mappers";

const ACCESS_TOKEN = "22.1893456000.s.stamp~sig";

describe("mapRedeemedLinkResult", () => {
  it("keeps the signed submission access token", () => {
    const mapped = mapRedeemedLinkResult(
      ApiResult.success({
        submissionId: 22,
        created: true,
        accessToken: "opaque-token",
        submissionAccessToken: ACCESS_TOKEN,
        submissionAccessTokenExpiresAt: "2030-01-01T00:00:00Z",
      }),
    );

    expect(mapped).toEqual(
      ApiResult.success({
        submissionId: "22",
        created: true,
        submissionAccessToken: ACCESS_TOKEN,
        submissionAccessTokenExpiresAt: "2030-01-01T00:00:00Z",
      }),
    );
  });

  it("falls back to the opaque token from an API without endatix#1411, so public-form links keep opening", () => {
    const mapped = mapRedeemedLinkResult(
      ApiResult.success({
        submissionId: "22",
        created: false,
        accessToken: "opaque-token",
      }),
    );

    expect(ApiResult.isSuccess(mapped) && mapped.data).toEqual({
      submissionId: "22",
      created: false,
      submissionAccessToken: "opaque-token",
      submissionAccessTokenExpiresAt: null,
    });
  });
});
