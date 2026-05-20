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

describe("resolveStorageGateInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
    mockGetToken.mockReturnValue(Result.success("cookie-sub-token"));
  });

  it("merges submission cookie when allowCookieFallback is omitted", async () => {
    const gate = await resolveStorageGateInput({ formId: "100" });

    expect(mockGetToken).toHaveBeenCalledWith("100");
    expect(gate.token).toBe("cookie-sub-token");
    expect(gate.tokenType).toBe("SubmissionToken");
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
