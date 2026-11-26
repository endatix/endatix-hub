import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

const { mockGetToken, mockCookies } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(function () {
    return { getToken: mockGetToken };
  }),
}));

import { resolveStorageGateInput } from "../resolve-gate-from-request";
import { resolveAuthoredImageGate } from "../resolve-public-storage-gate";

describe("resolveStorageGateInput", () => {
  beforeEach(() => {
    mockCookies.mockResolvedValue({});
    mockGetToken.mockReturnValue(Result.success("cookie-sub-token"));
  });

  it("merges submission cookie when allowCookieFallback is omitted", async () => {
    const gate = await resolveStorageGateInput({ formId: "100" });

    expect(mockGetToken).toHaveBeenCalledWith("100");
    expect(gate.token).toBe("cookie-sub-token");
    expect(gate.tokenType).toBe("SubmissionToken");
  });

  it("reads a personalized link's cookie access token as an AccessToken", async () => {
    mockGetToken.mockReturnValue(Result.success("22.1893456000.s.stamp~sig"));

    const gate = await resolveStorageGateInput({ formId: "100" });

    expect(gate.token).toBe("22.1893456000.s.stamp~sig");
    expect(gate.tokenType).toBe("AccessToken");
  });

  it("takes the authored image credential and its kind from the selected cookie", async () => {
    // Arrange
    const token = "22.1893456000.s.stamp~sig";
    mockGetToken.mockReturnValue(Result.success(token));

    // Act
    const result = await resolveAuthoredImageGate(
      { formId: "100", tokenType: "SubmissionToken" },
      null,
    );

    // Assert
    expect(result).toEqual(
      Result.success({ formId: "100", token, tokenType: "AccessToken" }),
    );
  });

  it("rejects inconsistent explicit credential metadata instead of selecting a cookie", async () => {
    // Act
    const result = await resolveAuthoredImageGate(
      {
        formId: "100",
        token: "abc123",
        tokenType: "AccessToken",
      },
      null,
    );

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("skips cookie when allowCookieFallback is false", async () => {
    const gate = await resolveStorageGateInput(
      { formId: "100" },
      { allowCookieFallback: false },
    );

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(gate.token).toBeUndefined();
  });

  it("does not read cookie when body already has a token", async () => {
    const gate = await resolveStorageGateInput({
      formId: "100",
      token: "body-token",
      tokenType: "SubmissionToken",
    });

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(gate.token).toBe("body-token");
  });
});
