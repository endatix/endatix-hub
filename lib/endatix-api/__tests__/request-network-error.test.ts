import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiErrorType, ApiResult, ERROR_CODE } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("EndatixApi network failures", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps TypeError fetch failed to network_error with cause scalars", async () => {
    // Arrange
    const cause = Object.assign(new Error("Connect Timeout Error"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
      name: "ConnectTimeoutError",
    });
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed", { cause }));
    const api = new EndatixApi();

    // Act
    const result = await api.submissions.public.getByAccessToken(
      "123",
      "1.2.x.sig",
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.type).toBe(ApiErrorType.NetworkError);
      expect(result.error.errorCode).toBe(ERROR_CODE.NETWORK_ERROR);
      expect(result.error.details?.causeCode).toBe("UND_ERR_CONNECT_TIMEOUT");
      expect(result.error.details?.causeName).toBe("ConnectTimeoutError");
    }
  });
});
